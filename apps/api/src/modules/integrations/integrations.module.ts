import { Global, Module, forwardRef } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PlatformModule } from '../platform/platform.module';
import { UyumsoftSoapClient } from './einvoice/uyumsoft-soap.client';
import { UyumsoftEInvoiceProvider } from './einvoice/uyumsoft-einvoice.provider';
import { OpenBankingService } from './open-banking/open-banking.service';
import { IyzicoProvider } from './payments/iyzico.provider';
import { PaytrProvider } from './payments/paytr.provider';
import { PaymentService } from './payments/payment.service';
import { EmailService } from './notifications/email.service';
import { SmsService } from './notifications/sms.service';
import { ApiKeysService } from './api-keys/api-keys.service';

@Global()
@Module({
  imports: [forwardRef(() => PlatformModule)],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    UyumsoftSoapClient,
    UyumsoftEInvoiceProvider,
    OpenBankingService,
    IyzicoProvider,
    PaytrProvider,
    PaymentService,
    EmailService,
    SmsService,
    ApiKeysService,
  ],
  exports: [
    UyumsoftEInvoiceProvider,
    UyumsoftSoapClient,
    OpenBankingService,
    PaymentService,
    EmailService,
    IntegrationsService,
    SmsService,
    ApiKeysService,
  ],
})
export class IntegrationsModule {}
