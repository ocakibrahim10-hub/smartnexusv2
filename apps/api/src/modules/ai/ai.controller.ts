import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, ModuleGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ocr')
  @RequireModule('AI.ASSISTANT')
  async processOcr(@Request() req, @Body() data: any) {
    // Expects base64 image or multipart/form-data
    return this.aiService.processOcrReceipt(req.user.tenantId, Buffer.from(data.image, 'base64'));
  }

  @Post('chat')
  @RequireModule('AI.ASSISTANT')
  async askChatbot(@Request() req, @Body() body: { query: string }) {
    return this.aiService.askChatbot(req.user.tenantId, body.query);
  }
}
