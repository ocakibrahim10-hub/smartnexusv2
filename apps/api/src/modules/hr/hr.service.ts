import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // 1. Personnel (Contacts with isPersonnel = true)
  async getPersonnel(tenantId: string) {
    return this.prisma.contact.findMany({
      where: { tenantId, isPersonnel: true },
      include: {
        personnelProfile: {
          include: { department: true, position: true }
        },
        drivenVehicles: true,
        managedWarehouses: true,
        personnelUser: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createPersonnel(tenantId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          tenantId,
          type: 'CUSTOMER',
          isPersonnel: true,
          name: data.name,
          phone: data.phone,
          email: data.email,
          nationalId: data.nationalId,
          personnelRole: data.positionId ? 'BASED_ON_POSITION' : data.position,
          personnelProfile: {
            create: {
              departmentId: data.departmentId,
              positionId: data.positionId,
              hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
              baseSalary: parseFloat(data.baseSalary) || 0,
            }
          }
        },
        include: { personnelProfile: true }
      });

      if (data.createLogin && data.email && data.password) {
        const passwordHash = await argon2.hash(data.password);
        await tx.user.create({
          data: {
            tenantId,
            email: data.email,
            password: passwordHash,
            name: data.name,
            role: data.role || 'STAFF',
            permissions: data.permissions || [],
            contactId: contact.id,
            phone: data.phone
          }
        });
      }

      return contact;
    });
  }

  // 1b. Departments & Positions
  async getDepartments(tenantId: string) {
    return this.prisma.hrDepartment.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createDepartment(tenantId: string, data: { name: string }) {
    return this.prisma.hrDepartment.create({ data: { tenantId, name: data.name } });
  }

  async getPositions(tenantId: string) {
    return this.prisma.hrPosition.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createPosition(tenantId: string, data: { name: string }) {
    return this.prisma.hrPosition.create({ data: { tenantId, name: data.name } });
  }

  async updatePersonnelLogin(tenantId: string, contactId: string, data: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId, tenantId } });
    if (!contact) throw new NotFoundException('Personel bulunamadı');

    const user = await this.prisma.user.findUnique({ where: { contactId } });

    if (user) {
      const updateData: any = {
        role: data.role,
        permissions: data.permissions,
        email: data.email
      };
      if (data.password) {
         updateData.password = await argon2.hash(data.password);
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    } else {
      if (!data.email || !data.password) throw new Error('E-posta ve Şifre zorunludur');
      const passwordHash = await argon2.hash(data.password);
      await this.prisma.user.create({
        data: {
          tenantId,
          contactId,
          name: contact.name,
          email: data.email,
          password: passwordHash,
          role: data.role || 'STAFF',
          permissions: data.permissions || [],
          phone: contact.phone
        }
      });
    }
    return { success: true };
  }

  // 2. Leave Requests
  async getLeaves(tenantId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { tenantId },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLeaveRequest(tenantId: string, data: any) {
    return this.prisma.leaveRequest.create({
      data: {
        tenantId,
        contactId: data.contactId,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: parseInt(data.days) || 1,
        reason: data.reason,
        status: 'APPROVED', // Varsayılan olarak onaylı yapıyoruz demo için
      }
    });
  }

  // 3. Payroll (Bordro)
  async getPayrolls(tenantId: string) {
    return this.prisma.payrollSlip.findMany({
      where: { tenantId },
      include: { contact: { select: { id: true, name: true } }, expense: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }]
    });
  }

  async generatePayrollForMonth(tenantId: string, month: number, year: number) {
    const personnel = await this.prisma.contact.findMany({
      where: { tenantId, isPersonnel: true, isActive: true },
      include: { personnelProfile: true }
    });

    const slips = [];
    for (const p of personnel) {
      if (!p.personnelProfile) continue;
      
      const existing = await this.prisma.payrollSlip.findFirst({
        where: { tenantId, contactId: p.id, periodMonth: month, periodYear: year }
      });
      if (existing) continue;

      const base = p.personnelProfile.baseSalary;
      const deductions = 0; // İleride eklenebilir
      const bonus = 0; // İleride eklenebilir
      const net = base + bonus - deductions;

      const slip = await this.prisma.payrollSlip.create({
        data: {
          tenantId,
          contactId: p.id,
          periodMonth: month,
          periodYear: year,
          baseSalary: base,
          bonus,
          deductions,
          netSalary: net,
          status: 'DRAFT'
        }
      });
      slips.push(slip);
    }
    return slips;
  }

  async payPayroll(tenantId: string, id: string, bankAccountId: string) {
    const slip = await this.prisma.payrollSlip.findUnique({
      where: { id, tenantId },
      include: { contact: true }
    });
    
    if (!slip || slip.status === 'PAID') throw new NotFoundException('Geçerli bordro bulunamadı');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Expense
      const expense = await tx.expense.create({
        data: {
          tenantId,
          category: 'SALARY',
          amount: slip.netSalary,
          description: `${slip.periodMonth}/${slip.periodYear} Dönemi Maaş Ödemesi - ${slip.contact.name}`,
          expenseDate: new Date(),
          contactId: slip.contactId,
        }
      });

      // Fix Category to SALARY
      await tx.$executeRaw`UPDATE "expenses" SET category = 'SALARY' WHERE id = ${expense.id}`;

      // 2. Create Bank Transaction
      await tx.bankTransaction.create({
        data: {
          tenantId,
          bankAccountId,
          type: 'EXPENSE',
          amount: slip.netSalary,
          description: `Maaş Ödemesi: ${slip.contact.name}`,
        }
      });

      // 3. Update Slip
      return tx.payrollSlip.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentDate: new Date(),
          expenseId: expense.id
        }
      });
    });
  }
}
