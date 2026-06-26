import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ContactsModule } from './modules/contacts/contacts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { POSModule } from './modules/pos/pos.module';
import { CashModule } from './modules/cash/cash.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TmsModule } from './modules/tms/tms.module';
import { B2bModule } from './modules/b2b/b2b.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MessagesModule } from './modules/messages/messages.module';
import { SupportModule } from './modules/support/support.module';
import { UsersModule } from './modules/users/users.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PlatformModule } from './modules/platform/platform.module';
import { HrModule } from './modules/hr/hr.module';
import { CrmModule } from './modules/crm/crm.module';
import { AiModule } from './modules/ai/ai.module';
import { B2cModule } from './modules/b2c/b2c.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { LedgerModule } from './common/ledger.module';
import { AuditModule } from './common/audit.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { LedgerApiModule } from './modules/ledger/ledger.module';
import { PortalModule } from './modules/portal/portal.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { PlanLimitsModule } from './common/plan-limits.module';
import { RolesGuard } from './common/guards/roles.guard';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MrpModule } from './modules/mrp/mrp.module';
import { HealthController } from './health.controller';
import { DemoGuard } from './common/guards/demo.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PlanLimitsModule,
    LedgerModule,
    AuditModule,
    IntegrationsModule,
    PrismaModule,
    AuthModule,
    ContactsModule,
    InvoicesModule,
    POSModule,
    CashModule,
    ReportsModule,
    ProductsModule,
    InventoryModule,
    TmsModule,
    B2bModule,
    TenantsModule,
    MessagesModule,
    SupportModule,
    UsersModule,
    ExpensesModule,
    LedgerApiModule,
    PortalModule,
    MarketplaceModule,
    PlatformModule,
    HrModule,
    CrmModule,
    AiModule,
    B2cModule,
    MobileModule,
    UploadsModule,
    MrpModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: DemoGuard },
  ],
})
export class AppModule {}
