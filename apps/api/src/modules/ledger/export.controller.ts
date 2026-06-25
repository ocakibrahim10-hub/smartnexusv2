import { Controller, Get, Query, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { toCsv } from '../../common/export.util';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('export')
export class ExportController {
  constructor(private prisma: PrismaService) {}

  @Get('invoices.csv')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async invoicesCsv(@Request() req, @Query() q: any, @Res() res: Response) {
    const where: any = { tenantId: req.user.tenantId };
    if (q.startDate || q.endDate) {
      where.date = {};
      if (q.startDate) where.date.gte = new Date(q.startDate);
      if (q.endDate) where.date.lte = new Date(q.endDate + 'T23:59:59');
    }

    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { contact: { select: { name: true } } },
    });

    const csv = toCsv(
      rows.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        series: r.series,
        number: r.number,
        type: r.type,
        contact: r.contact.name,
        subtotal: r.subtotal,
        vat: r.vatTotal,
        total: r.total,
        status: r.status,
      })),
      [
        { key: 'date', label: 'Tarih' },
        { key: 'series', label: 'Seri' },
        { key: 'number', label: 'No' },
        { key: 'type', label: 'Tip' },
        { key: 'contact', label: 'Cari' },
        { key: 'subtotal', label: 'Ara Toplam' },
        { key: 'vat', label: 'KDV' },
        { key: 'total', label: 'Toplam' },
        { key: 'status', label: 'Durum' },
      ],
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=faturalar.csv');
    res.send(csv);
  }

  @Get('contacts.csv')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async contactsCsv(@Request() req, @Res() res: Response) {
    const rows = await this.prisma.contact.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const csv = toCsv(
      rows.map((r) => ({
        code: r.code,
        name: r.name,
        type: r.type,
        taxNo: r.taxNo,
        phone: r.phone,
        email: r.email,
        balance: r.balance,
      })),
      [
        { key: 'code', label: 'Kod' },
        { key: 'name', label: 'Unvan' },
        { key: 'type', label: 'Tip' },
        { key: 'taxNo', label: 'VKN/TCKN' },
        { key: 'phone', label: 'Telefon' },
        { key: 'email', label: 'E-posta' },
        { key: 'balance', label: 'Bakiye' },
      ],
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=cariler.csv');
    res.send(csv);
  }
}
