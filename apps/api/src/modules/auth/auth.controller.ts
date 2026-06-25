import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, PhoneLoginDto, RegisterBusinessDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giriş yap' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('login-phone')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telefon veya e-posta benzeri numara ile giriş' })
  loginPhone(@Body() dto: PhoneLoginDto) {
    return this.authService.loginByPhone(dto);
  }

  @Post('register-business')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'İşletme kaydı (web sitesi)' })
  registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Token yenile' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Çıkış yap' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgisi' })
  me(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgisi (POST alias)' })
  mePost(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
