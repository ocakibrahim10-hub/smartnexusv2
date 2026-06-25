import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { getEffectiveUserModules } from '../../common/effective-user-modules';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    tenantId: string;
    role: string;
    type?: string;
    contactId?: string;
  }) {
    if (payload.type === 'portal' && payload.role === 'B2B_CUSTOMER') {
      const contact = await this.prisma.contact.findFirst({
        where: { id: payload.sub, portalEnabled: true, isActive: true },
        include: { tenant: true },
      });
      if (!contact || !contact.tenant.isActive) {
        throw new UnauthorizedException('Portal oturumu geçersiz');
      }
      return {
        id: contact.id,
        contactId: contact.id,
        email: contact.email,
        name: contact.name,
        role: 'B2B_CUSTOMER',
        tenantId: contact.tenantId,
        tenantType: 'PORTAL',
        tenantName: contact.tenant.name,
        modules: ['B2B.ORDERS'],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('Oturum geçersiz');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions ?? [],
      tenantId: user.tenantId,
      tenantType: user.tenant.type,
      tenantName: user.tenant.name,
      tenantPlan: user.tenant.plan,
      modules: getEffectiveUserModules(user.tenant, user),
    };
  }
}
