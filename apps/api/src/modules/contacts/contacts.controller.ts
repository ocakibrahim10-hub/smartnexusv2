import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('contacts')
export class ContactsController {
  constructor(private readonly svc: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Cari listesi' })
  findAll(@Request() req, @Query() query: any) {
    return this.svc.findAll(req.user.tenantId, query);
  }

  @Get('quick-search')
  @ApiOperation({ summary: 'POS hızlı cari arama' })
  quickSearch(@Request() req, @Query('q') q: string) {
    return this.svc.quickSearch(req.user.tenantId, q);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Yaşlandırma raporu' })
  aging(@Request() req) {
    return this.svc.getAging(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Cari ekstre' })
  statement(
    @Request() req,
    @Param('id') id: string,
    @Query('startDate') s: string,
    @Query('endDate') e: string,
  ) {
    return this.svc.getStatement(req.user.tenantId, id, s, e);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.svc.delete(req.user.tenantId, id);
  }
}
