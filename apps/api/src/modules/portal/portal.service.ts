import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { email, portalEnabled: true, isActive: true },
      include: { tenant: { select: { id: true, name: true, isActive: true } } },
    });

    if (!contact?.portalPassword || !contact.tenant.isActive) {
      throw new UnauthorizedException('Geçersiz portal girişi');
    }

    const ok = await argon2.verify(contact.portalPassword, password);
    if (!ok) throw new UnauthorizedException('Geçersiz portal girişi');

    const payload = {
      sub: contact.id,
      email: contact.email,
      tenantId: contact.tenantId,
      role: 'B2B_CUSTOMER',
      contactId: contact.id,
      type: 'portal',
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '8h',
    });

    return {
      accessToken,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        tenantName: contact.tenant.name,
      },
    };
  }

  async getMyOrders(contactId: string, tenantId: string) {
    return this.prisma.b2BOrder.findMany({
      where: { contactId, tenantId },
      orderBy: { requestedAt: 'desc' },
      include: {
        lines: { include: { product: { select: { name: true, unit: true } } } },
      },
    });
  }

  async getMyInvoices(contactId: string, tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { contactId, tenantId, status: { not: 'DRAFT' } },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  assertPortalUser(user: any) {
    if (user?.role !== 'B2B_CUSTOMER' || !user.contactId) {
      throw new ForbiddenException('B2B portal erişimi gerekli');
    }
  }
}
