import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, PhoneLoginDto, RegisterBusinessDto } from './dto/login.dto';
import { buildAuthUserPayload } from '../../common/effective-user-modules';
import { getPanelHomeRoute, validatePanelAccess, inferPanel, PanelType } from '../../common/panel-access';
import { normalizePhone } from '../../common/phone.util';
import { documentsForContext, LEGAL_DOCUMENT_VERSION } from '../../common/legal-documents';
import { TenantType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    try {
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
    } catch (error: any) {
      throw new BadRequestException('LOGIN_ERROR: ' + error.message + ' | STACK: ' + error.stack);
    }
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
    const phoneNorm = normalizePhone(dto.phone);
    if (!phoneNorm) {
      throw new BadRequestException(
        'Geçerli cep telefonu girin (5 ile başlayan 10 hane, başında 0 olmadan)',
      );
    }

    const requiredLegal = documentsForContext('dealer_business').map((d) => d.id);
    const accepted: string[] = dto.acceptedDocuments || [];
    if (!requiredLegal.every((id) => accepted.includes(id))) {
      throw new BadRequestException('Kayıt için tüm sözleşmeleri kabul etmelisiniz');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kayıtlı');

    const phoneTaken = await this.prisma.user.findFirst({ where: { phone: phoneNorm } });
    if (phoneTaken) throw new ConflictException('Bu telefon numarası zaten kayıtlı');

    const plan = dto.plan || 'BASIC';
    const rawPassword = dto.password?.trim() || phoneNorm;
    const passwordHash = await argon2.hash(rawPassword);
    const code = `BUS-${Date.now().toString(36).toUpperCase()}`;
    const taxNoNorm = dto.taxNo?.trim() || null;

    if (taxNoNorm) {
      const dup = await this.prisma.tenant.findFirst({
        where: { taxNo: taxNoNorm, type: 'BUSINESS', isActive: true },
      });
      if (dup) throw new ConflictException('Bu vergi numarası ile aktif kayıt zaten mevcut');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        code,
        type: 'BUSINESS',
        name: dto.name,
        email: dto.email,
        phone: phoneNorm,
        city: dto.city || null,
        taxNo: taxNoNorm,
        taxOffice: dto.taxOffice?.trim() || null,
        plan,
        isActive: false,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        phone: phoneNorm,
        role: 'OWNER',
      },
      include: {
        tenant: { include: { subscription: true, parent: { include: { subscription: true } } } },
      },
    });

    await this.prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: plan as any,
        startDate: new Date(),
        endDate: new Date(),
        autoRenew: false,
        modules: [],
        price: null,
      },
    });

    await this.prisma.legalAcceptance.createMany({
      data: accepted.map((documentId) => ({
        userId: user.id,
        tenantId: tenant.id,
        documentId,
        documentVersion: LEGAL_DOCUMENT_VERSION,
        context: 'dealer_business',
      })),
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
