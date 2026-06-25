import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Sadece görsel dosyası yüklenebilir') as any, false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadProductImage(@Request() req: any, @UploadedFile() file?: { filename: string; originalname: string }) {
    if (!file) throw new BadRequestException('Dosya seçilmedi');
    const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.API_PORT || 3001}`;
    const prefix = process.env.API_PREFIX || 'api';
    const url = `${base}/${prefix}/uploads/products/${file.filename}`;
    return { url, filename: file.filename, tenantId: req.user.tenantId };
  }
}
