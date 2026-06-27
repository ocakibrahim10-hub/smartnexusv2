import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('role-templates')
  getRoleTemplates() {
    return this.usersService.getRoleTemplates();
  }

  @Get('drivers')
  findDrivers(@Request() req: any) {
    return this.usersService.findDrivers(req.user.tenantId);
  }

  @Get('drivers/:id/profile')
  getDriverProfile(@Request() req: any, @Param('id') id: string) {
    return this.usersService.getDriverProfile(req.user.tenantId, id);
  }

  @Get('role-preview/:role')
  previewRole(@Param('role') role: string, @Request() req: any) {
    return this.usersService.previewRolePermissions(req.user.tenantId, role);
  }

  @Get()
  @Roles('OWNER', 'ADMIN')
  findAll(@Request() req: any, @Query() query: any) {
    return this.usersService.findAll(req.user.tenantId, req.user.role, query);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(req.user.tenantId, req.user.role, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() dto: any, @Request() req: any) {
    return this.usersService.create(req.user.tenantId, req.user.role, dto);
  }

  @Patch('me/preferences')
  updatePreferences(@Request() req: any, @Body() dto: any) {
    return this.usersService.updatePreferences(req.user.id, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.usersService.update(req.user.tenantId, req.user.role, id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles('OWNER', 'ADMIN')
  toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.usersService.toggleActive(req.user.tenantId, req.user.role, id);
  }

  @Patch(':id/password')
  @Roles('OWNER', 'ADMIN')
  changePassword(@Param('id') id: string, @Body() body: { password: string }, @Request() req: any) {
    return this.usersService.changePassword(req.user.tenantId, req.user.role, id, body.password);
  }
}
