import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import {
  ROLE_TEMPLATES,
  canManageUsers,
  getDefaultModulesForRole,
  resolveUserModulePermissions,
} from '../../common/role-permissions';
import { getEffectiveModules } from '../../common/effective-modules';
import { PlanLimitsService } from '../../common/plan-limits.service';
import { isValidNationalId, maskNationalId } from '../../common/national-id.util';
import { normalizePhone } from '../../common/phone.util';

/** Telefon ile giriş yapacak operasyon rolleri — telefon zorunlu. */
const PHONE_REQUIRED_ROLES = new Set([
  'ADMIN',
  'STAFF',
  'ACCOUNTANT',
  'CASHIER',
  'WAREHOUSE',
  'DRIVER',
]);

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
  isActive: true,
  phone: true,
  lastLoginAt: true,
  createdAt: true,
  contactId: true,
  contact: {
    select: {
      nationalId: true,
      address: true,
      city: true,
      district: true,
    },
  },
  tenant: { select: { name: true, type: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
  ) {}

  private assertCanManage(actorRole: string) {
    if (!canManageUsers(actorRole)) {
      throw new ForbiddenException('Personel ve rol yönetimi yetkiniz yok');
    }
  }

  private async getTenantModules(tenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true, parent: { include: { subscription: true } } },
    });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');
    return getEffectiveModules(tenant);
  }

  private async assertPhoneAvailable(tenantId: string, phone: string, excludeUserId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        phone,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('Bu telefon numarası bu işletmede başka bir personele kayıtlı');
    }
  }

  private resolvePhone(role: string, phone?: string | null): string | null {
    const normalized = normalizePhone(phone);
    if (PHONE_REQUIRED_ROLES.has(role) && !normalized) {
      throw new BadRequestException(
        'Bu rol için geçerli cep telefonu zorunludur (5XX XXX XX XX)',
      );
    }
    if (phone && !normalized) {
      throw new BadRequestException('Geçersiz telefon numarası (5 ile başlayan 10 hane)');
    }
    return normalized;
  }

  private sanitizePermissions(
    permissions: string[] | undefined,
    tenantModules: string[],
    role: string,
  ) {
    if (!permissions || permissions.length === 0) return [];
    return resolveUserModulePermissions(role, permissions, tenantModules);
  }

  getRoleTemplates() {
    return ROLE_TEMPLATES;
  }

  async findDrivers(tenantId: string) {
    const drivers = await this.prisma.user.findMany({
      where: { tenantId, role: 'DRIVER', isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        contact: { select: { nationalId: true, address: true, city: true, district: true } },
      },
    });
    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      role: d.role,
      nationalId: d.contact?.nationalId || null,
      nationalIdMasked: maskNationalId(d.contact?.nationalId),
      address: d.contact?.address || null,
      city: d.contact?.city || null,
      district: d.contact?.district || null,
    }));
  }

  async getDriverProfile(tenantId: string, driverId: string) {
    const d = await this.prisma.user.findFirst({
      where: { id: driverId, tenantId, role: 'DRIVER', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        contact: { select: { nationalId: true, address: true, city: true, district: true } },
      },
    });
    if (!d) throw new NotFoundException('Şoför bulunamadı');
    const fullAddress = [d.contact?.address, d.contact?.district, d.contact?.city]
      .filter(Boolean)
      .join(', ');
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      nationalId: d.contact?.nationalId || null,
      address: d.contact?.address || null,
      city: d.contact?.city || null,
      district: d.contact?.district || null,
      fullAddress,
    };
  }

  async findAll(
    tenantId: string,
    actorRole: string,
    query: { search?: string; role?: string; isActive?: string },
  ) {
    this.assertCanManage(actorRole);
    const where: any = { tenantId };
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search.replace(/\D/g, '') } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });
  }

  async updatePreferences(userId: string, preferences: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: { id: true, preferences: true },
    });
  }

  async findOne(tenantId: string, actorRole: string, id: string) {
    this.assertCanManage(actorRole);
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { ...userSelect, updatedAt: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  async create(
    tenantId: string,
    actorRole: string,
    dto: {
      name: string;
      email: string;
      password: string;
      role: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      city?: string;
      district?: string;
      permissions?: string[];
    },
  ) {
    this.assertCanManage(actorRole);
    if (dto.role === 'OWNER') {
      throw new BadRequestException('Yeni kullanıcıya Sahip rolü atanamaz');
    }
    if (dto.role === 'DRIVER' && !dto.nationalId) {
      throw new BadRequestException('Şoför için TC Kimlik No zorunludur');
    }
    if (dto.nationalId && !isValidNationalId(dto.nationalId)) {
      throw new BadRequestException('Geçersiz TC Kimlik No');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kullanımda');

    const phone = this.resolvePhone(dto.role, dto.phone);
    if (phone) await this.assertPhoneAvailable(tenantId, phone);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true, parent: { include: { subscription: true } } },
    });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');

    await this.planLimits.assertCanAddUser(tenantId, tenant.plan);

    const tenantModules = getEffectiveModules(tenant);
    const permissions = this.sanitizePermissions(dto.permissions, tenantModules, dto.role);
    const password = await argon2.hash(dto.password);

    const personnelCode = `PRS-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          tenantId,
          type: 'BOTH',
          name: dto.name,
          code: personnelCode,
          phone: phone || null,
          email: dto.email,
          nationalId: dto.nationalId || null,
          address: dto.address || null,
          city: dto.city || null,
          district: dto.district || null,
          isPersonnel: true,
          personnelRole: dto.role,
          isActive: true,
        },
      });

      return tx.user.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email,
          password,
          role: dto.role as any,
          phone: phone || null,
          permissions,
          contactId: contact.id,
        },
        select: { ...userSelect, contactId: true },
      });
    });
  }

  async update(
    tenantId: string,
    actorRole: string,
    id: string,
    dto: {
      name?: string;
      role?: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      city?: string;
      district?: string;
      isActive?: boolean;
      permissions?: string[];
    },
  ) {
    this.assertCanManage(actorRole);
    const existing = await this.findOne(tenantId, actorRole, id);
    const role = dto.role ?? existing.role;
    const phone =
      dto.phone !== undefined ? this.resolvePhone(role, dto.phone) : existing.phone;
    if (phone && phone !== existing.phone) {
      await this.assertPhoneAvailable(tenantId, phone, id);
    }
    if (role === 'DRIVER' && dto.nationalId === '' ) {
      throw new BadRequestException('Şoför için TC Kimlik No zorunludur');
    }
    if (dto.nationalId && !isValidNationalId(dto.nationalId)) {
      throw new BadRequestException('Geçersiz TC Kimlik No');
    }
    if (dto.role === 'OWNER' && existing.role !== 'OWNER') {
      throw new BadRequestException('Sahip rolü bu şekilde atanamaz');
    }
    if (PHONE_REQUIRED_ROLES.has(role)) {
      const effectivePhone =
        dto.phone !== undefined ? phone : normalizePhone(existing.phone);
      if (!effectivePhone) {
        throw new BadRequestException('Bu rol için geçerli cep telefonu zorunludur');
      }
    }

    const tenantModules = await this.getTenantModules(tenantId);
    const permissions =
      dto.permissions !== undefined
        ? this.sanitizePermissions(dto.permissions, tenantModules, role)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (existing.contactId) {
        await tx.contact.update({
          where: { id: existing.contactId },
          data: {
            name: dto.name ?? undefined,
            phone: phone ?? undefined,
            nationalId: dto.nationalId ?? undefined,
            address: dto.address ?? undefined,
            city: dto.city ?? undefined,
            district: dto.district ?? undefined,
            personnelRole: dto.role ?? undefined,
          },
        });
      }
      return tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          role: dto.role as any,
          phone: dto.phone !== undefined ? phone : undefined,
          isActive: dto.isActive,
          permissions,
        },
        select: userSelect,
      });
    });
  }

  async changePassword(tenantId: string, actorRole: string, id: string, newPassword: string) {
    this.assertCanManage(actorRole);
    await this.findOne(tenantId, actorRole, id);
    const password = await argon2.hash(newPassword);
    return this.prisma.user.update({ where: { id }, data: { password } });
  }

  async toggleActive(tenantId: string, actorRole: string, id: string) {
    this.assertCanManage(actorRole);
    const user = await this.findOne(tenantId, actorRole, id);
    if (user.role === 'OWNER') {
      throw new BadRequestException('Sahip hesabı pasifleştirilemez');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }

  /** Rol seçildiğinde önerilen modül listesi (kiracı aboneliğiyle kesişim). */
  async previewRolePermissions(tenantId: string, role: string) {
    const tenantModules = await this.getTenantModules(tenantId);
    return {
      role,
      modules: resolveUserModulePermissions(role, getDefaultModulesForRole(role), tenantModules),
    };
  }
}
