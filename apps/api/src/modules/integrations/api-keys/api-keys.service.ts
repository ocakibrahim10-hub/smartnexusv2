import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private hashKey(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  async list(tenantId: string) {
    return this.prisma.tenantApiKey.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, tenantPlan: string, dto: { name: string; scopes?: string[] }) {
    if (tenantPlan !== 'PLATINUM') {
      throw new ForbiddenException('API anahtarları yalnızca Platinyum planda kullanılabilir');
    }
    const raw = `snx_${randomBytes(24).toString('hex')}`;
    const keyPrefix = raw.slice(0, 12);
    const keyHash = await argon2.hash(this.hashKey(raw));

    const key = await this.prisma.tenantApiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes: dto.scopes?.length ? dto.scopes : ['read'],
      },
    });

    return {
      id: key.id,
      name: key.name,
      key: raw,
      keyPrefix,
      scopes: key.scopes,
      message: 'Anahtarı güvenli bir yerde saklayın; bir daha gösterilmeyecek.',
    };
  }

  async revoke(tenantId: string, id: string) {
    const key = await this.prisma.tenantApiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API anahtarı bulunamadı');
    return this.prisma.tenantApiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validate(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
    if (!rawKey?.startsWith('snx_')) return null;
    const prefix = rawKey.slice(0, 12);
    const candidates = await this.prisma.tenantApiKey.findMany({
      where: { keyPrefix: prefix, isActive: true },
    });
    for (const c of candidates) {
      const ok = await argon2.verify(c.keyHash, this.hashKey(rawKey));
      if (ok) {
        await this.prisma.tenantApiKey.update({
          where: { id: c.id },
          data: { lastUsedAt: new Date() },
        });
        return { tenantId: c.tenantId, scopes: c.scopes };
      }
    }
    return null;
  }
}
