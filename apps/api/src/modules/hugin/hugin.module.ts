import { Module } from '@nestjs/common';
import { HuginService } from './hugin.service';

@Module({ providers: [HuginService], exports: [HuginService] })
export class HuginModule {}
