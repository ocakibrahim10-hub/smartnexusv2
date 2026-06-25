import { Controller, Get, Post, Param, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getMessages(@Request() req: any) {
    return this.messagesService.getMessages(req.user.tenantId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user.tenantId);
  }

  @Get(':id')
  getMessage(@Param('id') id: string, @Request() req: any) {
    return this.messagesService.getMessage(id, req.user.tenantId);
  }

  @Post()
  createMessage(@Body() dto: any, @Request() req: any) {
    return this.messagesService.createMessage(req.user.tenantId, dto);
  }

  @Patch('mark-all-read')
  markAllRead(@Request() req: any) {
    return this.messagesService.markAllRead(req.user.tenantId);
  }
}
