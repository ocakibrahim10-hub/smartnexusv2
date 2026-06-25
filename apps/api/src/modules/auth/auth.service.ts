import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, PhoneLoginDto, RegisterBusinessDto } from './dto/login.dto';
import { buildAuthUserPayload } from '../../common/effective-user-modules';
import { getPanelHomeRoute, validatePanelAccess, inferPanel, PanelType } from '../../common/panel-access';
import { normalizePhone } from '../../common/phone.util';
import { TenantType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });

    if (!user) throw new UnauthorizedException('Email veya şifre hatalı');
    if (!user.isActive) throw new ForbiddenException('Hesabınız pasif durumda');
    if (!user.tenant.isActive) throw new ForbiddenException('Firma hesabı pasif durumda');

    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Email veya şifre hatalı');

    if (dto.panel) {
      validatePanelAccess(user.tenant.type, user.role, dto.panel);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    const profile = buildAuthUserPayload(user);
    const panel = dto.panel || inferPanel(user.tenant.type);

    return {
      user: {
        ...profile,
        panel,
        homeRoute: getPanelHomeRoute(user.role, profile.modules, panel),
      },
      ...tokens,
    };
  }

  async loginByPhone(dto: PhoneLoginDto) {
    const normalized = normalizePhone(dto.phone);
    if (!normalized) {
      throw new BadRequestException('Geçerli bir cep telefonu girin (5XX XXX XX XX)');
    }
    const panel: PanelType = dto.panel || 'isletme';
    const panelTenantTypes = this.tenantTypesForPanel(panel);

    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        phone: normalized,
        tenant: { isActive: true, type: { in: panelTenantTypes } },
      },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });

    const matched: (typeof candidates) = [];
    for (const user of candidates) {
      if (await argon2.verify(user.password, dto.password)) {
        matched.push(user);
      }
    }

    if (matched.length === 0) {
      throw new UnauthorizedException('Telefon veya şifre hatalı');
    }
    if (matched.length > 1) {
      throw new UnauthorizedException(
        'Bu telefon birden fazla hesapta kayıtlı. Yöneticinizle iletişime geçin veya e-posta ile giriş yapın.',
      );
    }

    const user = matched[0];
    validatePanelAccess(user.tenant.type, user.role, panel);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.tenantId,
      user.role,
    );
    const profile = buildAuthUserPayload(user);

    return {
      user: {
        ...profile,
        panel,
        homeRoute: getPanelHomeRoute(user.role, profile.modules, panel),
      },
      ...tokens,
    };
  }

  private tenantTypesForPanel(panel: PanelType): TenantType[] {
    if (panel === 'nexusadmin') return [TenantType.SUPERADMIN];
    if (panel === 'bayi') return [TenantType.DEALER];
    return [TenantType.BUSINESS, TenantType.BRANCH];
  }

  async registerBusiness(dto: RegisterBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kayıtlı');

    const passwordHash = await argon2.hash(dto.password);
    const code = `BUS-${Date.now().toString(36).toUpperCase()}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        code,
        type: 'BUSINESS',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        city: dto.city || null,
        taxNo: dto.taxNo || null,
        plan: 'BASIC',
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: 'OWNER',
      },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });

    const template = await this.prisma.planTemplate.findUnique({ where: { plan: 'BASIC' } });
    const { DEFAULT_PLAN_MODULES } = require('../../common/plan-limits');
    const basicModules = template?.modules ?? DEFAULT_PLAN_MODULES?.BASIC?.modules ?? [];

    await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'BASIC',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 gün deneme
        autoRenew: false,
        modules: basicModules,
        price: null,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    const profile = buildAuthUserPayload(user);

    return {
      user: {
        ...profile,
        panel: 'isletme',
        homeRoute: getPanelHomeRoute(user.role, profile.modules, 'isletme'),
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            tenant: {
              include: { subscription: true, parent: { include: { subscription: true } } },
            },
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
    }

    const { user } = tokenRecord;
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    const profile = buildAuthUserPayload(user);
    const panel = inferPanel(user.tenant.type);
    return {
      user: {
        ...profile,
        panel,
        homeRoute: getPanelHomeRoute(user.role, profile.modules, panel),
      },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    const profile = buildAuthUserPayload(user);
    const panel = inferPanel(user.tenant.type);
    return {
      ...profile,
      panel,
      homeRoute: getPanelHomeRoute(user.role, profile.modules, panel),
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Başarıyla çıkış yapıldı' };
  }

  private async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, tenantId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
