import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cliLog, cliError } from './cli-log';
import {
  DEALER_DEFAULT_MODULES,
  BASIC_BUSINESS_MODULES,
  PRO_BUSINESS_MODULES,
  PLATINUM_BUSINESS_MODULES,
  ALL_SUBMODULE_IDS,
} from '../src/common/module-catalog';

const prisma = new PrismaClient();

const ADMIN_MODULES = ALL_SUBMODULE_IDS;
const BASIC_MODULES = BASIC_BUSINESS_MODULES;
const PRO_MODULES = PRO_BUSINESS_MODULES;
const PLATINUM_MODULES = PLATINUM_BUSINESS_MODULES;
const DEALER_MODULES = DEALER_DEFAULT_MODULES;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysLater(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  cliLog('🌱 SmartNexus demo veriler yükleniyor...\n');

  // ─── PASSWORDS ───────────────────────────────────────────────────────
  const [hAdmin, hBayi, hIsletme, hSube] = await Promise.all([
    argon2.hash('SmartNexus2026!'),
    argon2.hash('Bayi2026!'),
    argon2.hash('Isletme2026!'),
    argon2.hash('Sube2026!'),
  ]);

  // ─── TENANTS ─────────────────────────────────────────────────────────
  const tenants = [
    {
      id: 'ten-root',
      type: 'SUPERADMIN',
      name: 'SmartNexus Platform',
      code: 'SNX-ROOT',
      plan: 'PLATINUM',
      email: 'admin@smartnexus.com',
      phone: '+90 212 555 0001',
      city: 'İstanbul',
      parentId: null,
    },
    // Bayiler
    {
      id: 'ten-d1',
      type: 'DEALER',
      name: 'İstanbul Bölge Bayisi',
      code: 'SNX-IST',
      plan: 'PLATINUM',
      email: 'bayi@demo.com',
      phone: '+90 212 555 0100',
      city: 'İstanbul',
      parentId: 'ten-root',
    },
    {
      id: 'ten-d2',
      type: 'DEALER',
      name: 'Ankara Bölge Bayisi',
      code: 'SNX-ANK',
      plan: 'PROFESSIONAL',
      email: 'ankara.bayi@demo.com',
      phone: '+90 312 555 0200',
      city: 'Ankara',
      parentId: 'ten-root',
    },
    {
      id: 'ten-d3',
      type: 'DEALER',
      name: 'İzmir Bölge Bayisi',
      code: 'SNX-IZM',
      plan: 'PROFESSIONAL',
      email: 'izmir.bayi@demo.com',
      phone: '+90 232 555 0300',
      city: 'İzmir',
      parentId: 'ten-root',
    },
    {
      id: 'ten-d4',
      type: 'DEALER',
      name: 'Bursa Bölge Bayisi',
      code: 'SNX-BRS',
      plan: 'BASIC',
      email: 'bursa.bayi@demo.com',
      phone: '+90 224 555 0400',
      city: 'Bursa',
      parentId: 'ten-root',
    },
    // İşletmeler — ten-d1
    {
      id: 'ten-b1',
      type: 'BUSINESS',
      name: 'Teknoloji Market A.Ş.',
      code: 'IST-TM001',
      plan: 'PLATINUM',
      email: 'isletme@demo.com',
      phone: '+90 212 555 0300',
      city: 'İstanbul',
      parentId: 'ten-d1',
    },
    {
      id: 'ten-b3',
      type: 'BUSINESS',
      name: 'Güneş Otelcilik Ltd.',
      code: 'IST-GO001',
      plan: 'PROFESSIONAL',
      email: 'guneshotel@demo.com',
      phone: '+90 212 555 0310',
      city: 'İstanbul',
      parentId: 'ten-d1',
    },
    {
      id: 'ten-b4',
      type: 'BUSINESS',
      name: 'Anadolu Gıda San. A.Ş.',
      code: 'IST-AG001',
      plan: 'BASIC',
      email: 'anadolugida@demo.com',
      phone: '+90 212 555 0320',
      city: 'İstanbul',
      parentId: 'ten-d1',
    },
    {
      id: 'ten-b5',
      type: 'BUSINESS',
      name: 'ProTeknik Makine Ltd.',
      code: 'IST-PM001',
      plan: 'PLATINUM',
      email: 'proteknik@demo.com',
      phone: '+90 212 555 0330',
      city: 'İstanbul',
      parentId: 'ten-d1',
    },
    // İşletmeler — ten-d2
    {
      id: 'ten-b2',
      type: 'BUSINESS',
      name: 'Ofis Dünyası Ltd. Şti.',
      code: 'ANK-OD001',
      plan: 'BASIC',
      email: 'ofis@demo.com',
      phone: '+90 312 555 0400',
      city: 'Ankara',
      parentId: 'ten-d2',
    },
    {
      id: 'ten-b6',
      type: 'BUSINESS',
      name: 'Başkent İnşaat A.Ş.',
      code: 'ANK-BI001',
      plan: 'PROFESSIONAL',
      email: 'baskentinsaat@demo.com',
      phone: '+90 312 555 0410',
      city: 'Ankara',
      parentId: 'ten-d2',
    },
    {
      id: 'ten-b7',
      type: 'BUSINESS',
      name: 'Ankara Tekstil San.',
      code: 'ANK-AT001',
      plan: 'BASIC',
      email: 'ankaratekstil@demo.com',
      phone: '+90 312 555 0420',
      city: 'Ankara',
      parentId: 'ten-d2',
    },
    // İşletmeler — ten-d3
    {
      id: 'ten-b8',
      type: 'BUSINESS',
      name: 'Ege Mimarlık Ltd.',
      code: 'IZM-EM001',
      plan: 'PROFESSIONAL',
      email: 'egemimari@demo.com',
      phone: '+90 232 555 0500',
      city: 'İzmir',
      parentId: 'ten-d3',
    },
    // Şubeler
    {
      id: 'ten-s1',
      type: 'BRANCH',
      name: 'Kadıköy Şubesi',
      code: 'IST-TM001-KDK',
      plan: 'BASIC',
      email: 'sube@demo.com',
      phone: '+90 216 555 0500',
      city: 'İstanbul',
      parentId: 'ten-b1',
    },
    {
      id: 'ten-s2',
      type: 'BRANCH',
      name: 'Beşiktaş Şubesi',
      code: 'IST-TM001-BSK',
      plan: 'BASIC',
      email: 'besiktas@demo.com',
      phone: '+90 212 555 0600',
      city: 'İstanbul',
      parentId: 'ten-b1',
    },
    {
      id: 'ten-s3',
      type: 'BRANCH',
      name: 'Bağcılar Şubesi',
      code: 'IST-TM001-BGC',
      plan: 'BASIC',
      email: 'bagcilar@demo.com',
      phone: '+90 212 555 0700',
      city: 'İstanbul',
      parentId: 'ten-b1',
    },
  ];

  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: {
        isActive: true,
        plan: t.plan as any,
        code: t.code,
        email: t.email,
        phone: t.phone,
        city: t.city,
        parentId: t.parentId,
      },
      create: {
        id: t.id,
        type: t.type as any,
        name: t.name,
        code: t.code,
        plan: t.plan as any,
        email: t.email,
        phone: t.phone,
        city: t.city,
        parentId: t.parentId,
      },
    });
  }
  cliLog(`✓ ${tenants.length} tenant`);

  // ─── SUBSCRIPTIONS ───────────────────────────────────────────────────
  const subs = [
    { id: 'sub-root', tid: 'ten-root', plan: 'PLATINUM', price: 0, mods: ADMIN_MODULES },
    { id: 'sub-d1', tid: 'ten-d1', plan: 'PLATINUM', price: 4999, mods: DEALER_MODULES },
    { id: 'sub-d2', tid: 'ten-d2', plan: 'PROFESSIONAL', price: 2999, mods: DEALER_MODULES },
    { id: 'sub-d3', tid: 'ten-d3', plan: 'PROFESSIONAL', price: 2999, mods: DEALER_MODULES },
    {
      id: 'sub-d4',
      tid: 'ten-d4',
      plan: 'BASIC',
      price: 999,
      mods: DEALER_MODULES.filter((m) => !['DEALER.COMMISSION', 'DEALER.REPORTS'].includes(m)),
    },
    { id: 'sub-b1', tid: 'ten-b1', plan: 'PLATINUM', price: 2999, mods: ADMIN_MODULES },
    { id: 'sub-b2', tid: 'ten-b2', plan: 'BASIC', price: 499, mods: BASIC_MODULES },
    { id: 'sub-b3', tid: 'ten-b3', plan: 'PROFESSIONAL', price: 1499, mods: PRO_MODULES },
    { id: 'sub-b4', tid: 'ten-b4', plan: 'BASIC', price: 499, mods: BASIC_MODULES },
    { id: 'sub-b5', tid: 'ten-b5', plan: 'PLATINUM', price: 2999, mods: PLATINUM_MODULES },
    { id: 'sub-b6', tid: 'ten-b6', plan: 'PROFESSIONAL', price: 1499, mods: PRO_MODULES },
    { id: 'sub-b7', tid: 'ten-b7', plan: 'BASIC', price: 499, mods: BASIC_MODULES },
    { id: 'sub-b8', tid: 'ten-b8', plan: 'PROFESSIONAL', price: 1499, mods: PRO_MODULES },
    { id: 'sub-s1', tid: 'ten-s1', plan: 'BASIC', price: 299, mods: BASIC_MODULES },
    { id: 'sub-s2', tid: 'ten-s2', plan: 'BASIC', price: 299, mods: BASIC_MODULES },
    { id: 'sub-s3', tid: 'ten-s3', plan: 'BASIC', price: 299, mods: BASIC_MODULES },
  ];
  for (const s of subs) {
    await prisma.subscription.upsert({
      where: { tenantId: s.tid },
      update: { plan: s.plan as any, modules: s.mods, price: s.price },
      create: {
        id: s.id,
        tenantId: s.tid,
        plan: s.plan as any,
        startDate: daysAgo(90),
        endDate: daysLater(275),
        autoRenew: true,
        price: s.price,
        modules: s.mods,
      },
    });
  }
  cliLog(`✓ ${subs.length} subscription`);

  // ─── USERS ───────────────────────────────────────────────────────────
  const users = [
    {
      id: 'usr-root',
      tid: 'ten-root',
      email: 'admin@smartnexus.com',
      pw: hAdmin,
      name: 'Platform Yöneticisi',
      role: 'OWNER',
    },
    {
      id: 'usr-d1',
      tid: 'ten-d1',
      email: 'bayi@demo.com',
      pw: hBayi,
      name: 'Ali Kaya',
      role: 'OWNER',
    },
    {
      id: 'usr-d1b',
      tid: 'ten-d1',
      email: 'ali.asistan@demo.com',
      pw: hBayi,
      name: 'Elif Şahin',
      role: 'ADMIN',
    },
    {
      id: 'usr-d2',
      tid: 'ten-d2',
      email: 'ankara.bayi@demo.com',
      pw: hBayi,
      name: 'Mehmet Yılmaz',
      role: 'OWNER',
    },
    {
      id: 'usr-d3',
      tid: 'ten-d3',
      email: 'izmir.bayi@demo.com',
      pw: hBayi,
      name: 'Can Demir',
      role: 'OWNER',
    },
    {
      id: 'usr-d4',
      tid: 'ten-d4',
      email: 'bursa.bayi@demo.com',
      pw: hBayi,
      name: 'Hande Güler',
      role: 'OWNER',
    },
    {
      id: 'usr-b1',
      tid: 'ten-b1',
      email: 'isletme@demo.com',
      pw: hIsletme,
      name: 'Zeynep Arslan',
      role: 'OWNER',
    },
    {
      id: 'usr-muh',
      tid: 'ten-b1',
      email: 'muhasebe@demo.com',
      pw: hIsletme,
      name: 'Ayşe Çelik',
      role: 'ACCOUNTANT',
      phone: '5321234571',
    },
    {
      id: 'usr-kas',
      tid: 'ten-b1',
      email: 'kasiyer@demo.com',
      pw: hIsletme,
      name: 'Deniz Koç',
      role: 'CASHIER',
      phone: '5321234567',
    },
    {
      id: 'usr-dep',
      tid: 'ten-b1',
      email: 'depo@demo.com',
      pw: hIsletme,
      name: 'Hasan Yıldız',
      role: 'WAREHOUSE',
      phone: '5321234568',
    },
    {
      id: 'usr-sof',
      tid: 'ten-b1',
      email: 'sofor@demo.com',
      pw: hIsletme,
      name: 'Murat Aydın',
      role: 'DRIVER',
      phone: '5321234569',
    },
    {
      id: 'usr-sof2',
      tid: 'ten-b1',
      email: 'sofor2@demo.com',
      pw: hIsletme,
      name: 'Kemal Öztürk',
      role: 'DRIVER',
      phone: '5321234572',
    },
    {
      id: 'usr-stf1',
      tid: 'ten-b1',
      email: 'personel1@demo.com',
      pw: hIsletme,
      name: 'Selin Kara',
      role: 'STAFF',
      phone: '5321234570',
    },
    {
      id: 'usr-stf2',
      tid: 'ten-b1',
      email: 'personel2@demo.com',
      pw: hIsletme,
      name: 'Burak Tekin',
      role: 'STAFF',
      phone: '5321234573',
    },
    {
      id: 'usr-b2',
      tid: 'ten-b2',
      email: 'ofis@demo.com',
      pw: hIsletme,
      name: 'Fatma Doğan',
      role: 'OWNER',
    },
    {
      id: 'usr-b3',
      tid: 'ten-b3',
      email: 'guneshotel@demo.com',
      pw: hIsletme,
      name: 'Okan Güneş',
      role: 'OWNER',
    },
    {
      id: 'usr-b4',
      tid: 'ten-b4',
      email: 'anadolugida@demo.com',
      pw: hIsletme,
      name: 'Nurcan Aslan',
      role: 'OWNER',
    },
    {
      id: 'usr-b5',
      tid: 'ten-b5',
      email: 'proteknik@demo.com',
      pw: hIsletme,
      name: 'Tarık Erdoğan',
      role: 'OWNER',
    },
    {
      id: 'usr-b6',
      tid: 'ten-b6',
      email: 'baskentinsaat@demo.com',
      pw: hIsletme,
      name: 'Serdar Koç',
      role: 'OWNER',
    },
    {
      id: 'usr-b7',
      tid: 'ten-b7',
      email: 'ankaratekstil@demo.com',
      pw: hIsletme,
      name: 'Leyla Aktaş',
      role: 'OWNER',
    },
    {
      id: 'usr-b8',
      tid: 'ten-b8',
      email: 'egemimari@demo.com',
      pw: hIsletme,
      name: 'Volkan Özer',
      role: 'OWNER',
    },
    {
      id: 'usr-s1',
      tid: 'ten-s1',
      email: 'sube@demo.com',
      pw: hSube,
      name: 'Emre Kurt',
      role: 'OWNER',
    },
    {
      id: 'usr-s2',
      tid: 'ten-s2',
      email: 'besiktas@demo.com',
      pw: hSube,
      name: 'Selin Aktaş',
      role: 'OWNER',
    },
    {
      id: 'usr-s3',
      tid: 'ten-s3',
      email: 'bagcilar@demo.com',
      pw: hSube,
      name: 'Yusuf Çetin',
      role: 'OWNER',
    },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.pw, name: u.name, phone: (u as any).phone || undefined },
      create: {
        id: u.id,
        tenantId: u.tid,
        email: u.email,
        password: u.pw,
        name: u.name,
        role: u.role as any,
        phone: (u as any).phone || null,
      },
    });
  }
  cliLog(`✓ ${users.length} user`);

  // ─── PRODUCT CATEGORIES ──────────────────────────────────────────────
  const cats = [
    { id: 'cat-elek', name: 'Elektronik' },
    { id: 'cat-cevre', name: 'Çevre Birimi' },
    { id: 'cat-ofis', name: 'Ofis Malzemeleri' },
    { id: 'cat-yazilim', name: 'Yazılım & Lisans' },
    { id: 'cat-network', name: 'Network & Altyapı' },
  ];
  for (const c of cats) {
    await prisma.productCategory.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, tenantId: 'ten-b1', name: c.name },
    });
  }

  // ─── PRODUCTS ────────────────────────────────────────────────────────
  const IMG = 'https://images.unsplash.com';
  const products = [
    {
      id: 'prod-01',
      code: 'ELK-001',
      name: 'Laptop Dell Inspiron 15',
      cat: 'cat-elek',
      pp: 12000,
      sp: 16500,
      min: 3,
      unit: 'PIECE',
      bar: '8691234567890',
      img: `${IMG}/photo-1496181133206-282ce443021a?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-02',
      code: 'ELK-002',
      name: 'Monitor Samsung 27"',
      cat: 'cat-elek',
      pp: 4500,
      sp: 6200,
      min: 5,
      unit: 'PIECE',
      bar: '8691234567891',
      img: `${IMG}/photo-1527443224154-c4aaf87d65e5?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-03',
      code: 'ELK-003',
      name: 'Klavye Logitech MX Keys',
      cat: 'cat-cevre',
      pp: 800,
      sp: 1200,
      min: 10,
      unit: 'PIECE',
      bar: '8691234567892',
      img: `${IMG}/photo-1587829741301-d9805cb1d4ed?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-04',
      code: 'ELK-004',
      name: 'Mouse Logitech MX Master',
      cat: 'cat-cevre',
      pp: 600,
      sp: 950,
      min: 10,
      unit: 'PIECE',
      bar: '8691234567893',
      img: `${IMG}/photo-1527864550417-865fd487a228?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-05',
      code: 'ELK-005',
      name: 'UPS 650VA APC',
      cat: 'cat-elek',
      pp: 1200,
      sp: 1800,
      min: 5,
      unit: 'PIECE',
      bar: '8691234567894',
      img: `${IMG}/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-06',
      code: 'ELK-006',
      name: 'SSD 1TB Samsung 870',
      cat: 'cat-elek',
      pp: 1400,
      sp: 2100,
      min: 8,
      unit: 'PIECE',
      bar: '8691234567895',
      img: `${IMG}/photo-1597872200959-0b360d28e279?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-07',
      code: 'ELK-007',
      name: 'RAM 16GB DDR4',
      cat: 'cat-elek',
      pp: 900,
      sp: 1400,
      min: 10,
      unit: 'PIECE',
      bar: '8691234567896',
      img: `${IMG}/photo-1562976540-636e3320a68f?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-08',
      code: 'NET-001',
      name: 'Switch 24 Port Cisco',
      cat: 'cat-network',
      pp: 5500,
      sp: 7800,
      min: 2,
      unit: 'PIECE',
      bar: '8691234567897',
      img: `${IMG}/photo-1558494949-ef010cbdcc31?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-09',
      code: 'NET-002',
      name: 'Router Mikrotik RB450',
      cat: 'cat-network',
      pp: 2200,
      sp: 3200,
      min: 3,
      unit: 'PIECE',
      bar: '8691234567898',
      img: `${IMG}/photo-1605157697073-41e5e6b5c6d5?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-10',
      code: 'NET-003',
      name: 'Access Point Ubiquiti',
      cat: 'cat-network',
      pp: 1500,
      sp: 2200,
      min: 5,
      unit: 'PIECE',
      bar: '8691234567899',
      img: `${IMG}/photo-1544197150-6143146b7cfb?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-11',
      code: 'OFS-001',
      name: 'A4 Kağıt 500 Yaprak',
      cat: 'cat-ofis',
      pp: 45,
      sp: 75,
      min: 50,
      unit: 'PACKAGE',
      bar: '8691234560001',
      img: `${IMG}/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-12',
      code: 'OFS-002',
      name: 'Kalem Seti 12li',
      cat: 'cat-ofis',
      pp: 18,
      sp: 35,
      min: 30,
      unit: 'PACKAGE',
      bar: '8691234560002',
      img: `${IMG}/photo-1455395426949-2477e8ba5c70?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-13',
      code: 'YZL-001',
      name: 'Office 365 Business',
      cat: 'cat-yazilim',
      pp: 400,
      sp: 750,
      min: 0,
      unit: 'LICENSE',
      bar: null,
      srv: true,
      img: `${IMG}/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-14',
      code: 'YZL-002',
      name: 'Antivirüs 1 Yıl',
      cat: 'cat-yazilim',
      pp: 150,
      sp: 280,
      min: 0,
      unit: 'LICENSE',
      bar: null,
      srv: true,
      img: `${IMG}/photo-1563986768608-259d0ee025f9?w=400&h=400&fit=crop`,
    },
    {
      id: 'prod-15',
      code: 'YZL-003',
      name: 'Teknik Destek Saati',
      cat: 'cat-yazilim',
      pp: 200,
      sp: 450,
      min: 0,
      unit: 'HOUR',
      bar: null,
      srv: true,
      img: `${IMG}/photo-1553877522-43269d4ea984?w=400&h=400&fit=crop`,
    },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { imageUrl: (p as any).img },
      create: {
        id: p.id,
        tenantId: 'ten-b1',
        code: p.code,
        name: p.name,
        categoryId: p.cat,
        purchasePrice: p.pp,
        salePrice: p.sp,
        barcode: (p as any).bar ?? undefined,
        vatRate: 20,
        minQuantity: p.min,
        unit: p.unit as any,
        type: (p as any).srv ? 'SERVICE' : 'PRODUCT',
        isService: !!(p as any).srv,
        isActive: true,
        imageUrl: (p as any).img,
      },
    });
  }
  cliLog(`✓ ${products.length} ürün`);

  // ─── WAREHOUSES ──────────────────────────────────────────────────────
  await prisma.warehouse.upsert({
    where: { id: 'wh-01' },
    update: { isDefault: true },
    create: {
      id: 'wh-01',
      tenantId: 'ten-b1',
      name: 'Ana Depo',
      code: 'WH-001',
      address: 'Bağcılar Organize San. Bölgesi No:15 İstanbul',
      isDefault: true,
      isActive: true,
    },
  });
  await prisma.warehouse.upsert({
    where: { id: 'wh-02' },
    update: {},
    create: {
      id: 'wh-02',
      tenantId: 'ten-b1',
      name: 'Kadıköy Deposu',
      code: 'WH-002',
      address: 'Kadıköy Bağdat Cad. No:88 İstanbul',
      isActive: true,
    },
  });
  await prisma.warehouse.upsert({
    where: { id: 'wh-s1' },
    update: { isDefault: true },
    create: {
      id: 'wh-s1',
      tenantId: 'ten-s1',
      name: 'Kadıköy Şube Deposu',
      code: 'WH-S01',
      address: 'Kadıköy Moda Cad. No:42 İstanbul',
      isDefault: true,
      isActive: true,
    },
  });

  // ─── STOCK ───────────────────────────────────────────────────────────
  const stocks = [
    { pid: 'prod-01', wh: 'wh-01', qty: 45 },
    { pid: 'prod-02', wh: 'wh-01', qty: 32 },
    { pid: 'prod-03', wh: 'wh-01', qty: 120 },
    { pid: 'prod-04', wh: 'wh-01', qty: 95 },
    { pid: 'prod-05', wh: 'wh-01', qty: 18 },
    { pid: 'prod-06', wh: 'wh-01', qty: 67 },
    { pid: 'prod-07', wh: 'wh-01', qty: 84 },
    { pid: 'prod-08', wh: 'wh-01', qty: 12 },
    { pid: 'prod-09', wh: 'wh-01', qty: 9 },
    { pid: 'prod-10', wh: 'wh-01', qty: 23 },
    { pid: 'prod-11', wh: 'wh-01', qty: 350 },
    { pid: 'prod-12', wh: 'wh-01', qty: 180 },
    { pid: 'prod-01', wh: 'wh-02', qty: 12 },
    { pid: 'prod-02', wh: 'wh-02', qty: 8 },
    { pid: 'prod-03', wh: 'wh-02', qty: 45 },
    { pid: 'prod-04', wh: 'wh-02', qty: 38 },
    { pid: 'prod-06', wh: 'wh-02', qty: 22 },
    { pid: 'prod-11', wh: 'wh-02', qty: 80 },
  ];
  for (const s of stocks) {
    await prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: { productId: s.pid, warehouseId: s.wh, tenantId: 'ten-b1' },
      },
      update: { quantity: s.qty },
      create: { tenantId: 'ten-b1', productId: s.pid, warehouseId: s.wh, quantity: s.qty },
    });
  }

  // Birim dönüşümleri: A4 kağıt — koli/kutu ile giriş, adet ile satış
  await prisma.product.update({
    where: { id: 'prod-11' },
    data: { unit: 'ADET', saleUnit: 'ADET' },
  });
  await prisma.productUnit.deleteMany({ where: { productId: 'prod-11' } });
  await prisma.productUnit.createMany({
    data: [
      { productId: 'prod-11', unit: 'KOLI', factorToBase: 10, isPurchaseUnit: true },
      { productId: 'prod-11', unit: 'KUTU', factorToBase: 5, isPurchaseUnit: true },
      { productId: 'prod-11', unit: 'ADET', factorToBase: 1, isSaleUnit: true },
    ],
  });

  // Kütle örneği: prod-16 çimento — ton ile giriş, kg/gr ile satış
  await prisma.product.upsert({
    where: { id: 'prod-16' },
    update: {
      unit: 'KG',
      saleUnit: 'KG',
      imageUrl: `${IMG}/photo-1504307651254-2582865fd930?w=400&h=400&fit=crop`,
    },
    create: {
      id: 'prod-16',
      tenantId: 'ten-b1',
      code: 'INS-001',
      name: 'Çimento 50kg Torba',
      categoryId: 'cat-ofis',
      purchasePrice: 12,
      salePrice: 18,
      vatRate: 20,
      unit: 'KG',
      saleUnit: 'KG',
      minQuantity: 500,
      isActive: true,
      type: 'PRODUCT',
      imageUrl: `${IMG}/photo-1504307651254-2582865fd930?w=400&h=400&fit=crop`,
    },
  });
  await prisma.productUnit.deleteMany({ where: { productId: 'prod-16' } });
  await prisma.productUnit.createMany({
    data: [
      { productId: 'prod-16', unit: 'TON', factorToBase: 1000, isPurchaseUnit: true },
      { productId: 'prod-16', unit: 'KG', factorToBase: 1, isSaleUnit: true },
      { productId: 'prod-16', unit: 'GR', factorToBase: 0.001, isSaleUnit: true },
    ],
  });
  await prisma.stockItem.upsert({
    where: {
      productId_warehouseId_tenantId: {
        productId: 'prod-16',
        warehouseId: 'wh-01',
        tenantId: 'ten-b1',
      },
    },
    update: { quantity: 2500 },
    create: { tenantId: 'ten-b1', productId: 'prod-16', warehouseId: 'wh-01', quantity: 2500 },
  });

  // Örnek şube stok talebi (beklemede)
  await prisma.stockTransfer.upsert({
    where: { id: 'tr-req-01' },
    update: {},
    create: {
      id: 'tr-req-01',
      fromTenantId: 'ten-b1',
      toTenantId: 'ten-s1',
      status: 'PENDING',
      isRequest: true,
      notes: 'Haftalık şube stok talebi',
      lines: {
        create: [
          { productId: 'prod-03', quantity: 20, inputUnit: 'ADET', inputQuantity: 20 },
          { productId: 'prod-11', quantity: 50, inputUnit: 'KOLI', inputQuantity: 5 },
        ],
      },
    },
  });

  // ─── CASH ACCOUNTS ───────────────────────────────────────────────────
  await prisma.cashAccount.upsert({
    where: { id: 'ksa-01' },
    update: { isDefault: true },
    create: {
      id: 'ksa-01',
      tenantId: 'ten-b1',
      name: 'Ana Kasa',
      code: 'KSA-001',
      currency: 'TRY',
      balance: 25000,
      isDefault: true,
    },
  });
  await prisma.cashAccount.upsert({
    where: { id: 'ksa-02' },
    update: {},
    create: {
      id: 'ksa-02',
      tenantId: 'ten-b1',
      name: 'Şube Kasası',
      code: 'KSA-002',
      currency: 'TRY',
      balance: 5000,
    },
  });
  await prisma.cashAccount.upsert({
    where: { id: 'ksa-s1' },
    update: { isDefault: true },
    create: {
      id: 'ksa-s1',
      tenantId: 'ten-s1',
      name: 'Şube Kasası',
      code: 'KSA-S01',
      currency: 'TRY',
      balance: 1200,
      isDefault: true,
    },
  });
  await prisma.bankAccount.upsert({
    where: { id: 'bnk-01' },
    update: { isDefault: true },
    create: {
      id: 'bnk-01',
      tenantId: 'ten-b1',
      name: 'İş Bankası TL',
      iban: 'TR12 0006 4000 0011 2345 6789 01',
      bankName: 'İş Bankası',
      currency: 'TRY',
      balance: 180000,
      isDefault: true,
    },
  });
  await prisma.bankAccount.upsert({
    where: { id: 'bnk-02' },
    update: {},
    create: {
      id: 'bnk-02',
      tenantId: 'ten-b1',
      name: 'Garanti TL',
      iban: 'TR34 0006 2000 0011 9876 5432 10',
      bankName: 'Garanti BBVA',
      currency: 'TRY',
      balance: 75000,
    },
  });
  await prisma.bankAccount.upsert({
    where: { id: 'bnk-s1' },
    update: { isDefault: true },
    create: {
      id: 'bnk-s1',
      tenantId: 'ten-s1',
      name: 'Şube Banka',
      iban: 'TR56 0006 4000 0011 9999 8888 01',
      bankName: 'İş Bankası',
      currency: 'TRY',
      balance: 8500,
      isDefault: true,
    },
  });

  // Perakende müşteri (POS cari seçilmezse)
  for (const tid of ['ten-b1', 'ten-s1']) {
    await prisma.contact.upsert({
      where: { tenantId_code: { tenantId: tid, code: 'PERAKENDE' } },
      update: {},
      create: {
        tenantId: tid,
        code: 'PERAKENDE',
        name: 'Perakende Müşteri',
        type: 'CUSTOMER',
        isActive: true,
      },
    });
  }

  // ─── CONTACTS ────────────────────────────────────────────────────────
  const contacts = [
    {
      id: 'cnt-01',
      name: 'ABC Teknoloji A.Ş.',
      type: 'CUSTOMER',
      tax: '1234567890',
      phone: '+90 212 555 1001',
      email: 'abc@abc.com',
      city: 'İstanbul',
      balance: 12400,
    },
    {
      id: 'cnt-02',
      name: 'XYZ Danışmanlık Ltd.',
      type: 'CUSTOMER',
      tax: '9876543210',
      phone: '+90 212 555 1002',
      email: 'xyz@xyz.com',
      city: 'İstanbul',
      balance: 27240,
    },
    {
      id: 'cnt-03',
      name: 'TechDistributor A.Ş.',
      type: 'BOTH',
      tax: '5566778899',
      phone: '+90 212 555 1003',
      email: 'tech@tech.com',
      city: 'İstanbul',
      balance: 2160,
    },
    {
      id: 'cnt-04',
      name: 'Güneş Otelcilik Ltd.',
      type: 'CUSTOMER',
      tax: '1122334455',
      phone: '+90 212 555 1004',
      email: 'guneshotel@hotel.com',
      city: 'İstanbul',
      balance: 9800,
    },
    {
      id: 'cnt-05',
      name: 'Ege Mimarlık Ltd.',
      type: 'CUSTOMER',
      tax: '6677889900',
      phone: '+90 232 555 1005',
      email: 'ege@ege.com',
      city: 'İzmir',
      balance: 18500,
    },
    {
      id: 'cnt-06',
      name: 'Delta Yazılım A.Ş.',
      type: 'CUSTOMER',
      tax: '3344556677',
      phone: '+90 216 555 1006',
      email: 'delta@delta.com',
      city: 'İstanbul',
      balance: 5600,
    },
    {
      id: 'cnt-07',
      name: 'Mega Lojistik Ltd.',
      type: 'CUSTOMER',
      tax: '7788990011',
      phone: '+90 212 555 1007',
      email: 'mega@mega.com',
      city: 'İstanbul',
      balance: 14200,
    },
    {
      id: 'cnt-08',
      name: 'Star Mühendislik A.Ş.',
      type: 'CUSTOMER',
      tax: '2233445566',
      phone: '+90 312 555 1008',
      email: 'star@star.com',
      city: 'Ankara',
      balance: 7800,
    },
    {
      id: 'cnt-09',
      name: 'Anadolu Gıda San.',
      type: 'CUSTOMER',
      tax: '4455667788',
      phone: '+90 212 555 1009',
      email: 'anadolu@anadolu.com',
      city: 'İstanbul',
      balance: 3200,
    },
    {
      id: 'cnt-10',
      name: 'Pro İnşaat A.Ş.',
      type: 'CUSTOMER',
      tax: '8899001122',
      phone: '+90 312 555 1010',
      email: 'pro@pro.com',
      city: 'Ankara',
      balance: 22400,
    },
    {
      id: 'cnt-s01',
      name: 'Samsung Türkiye Tedarik A.Ş.',
      type: 'SUPPLIER',
      tax: '1010101010',
      phone: '+90 212 555 2001',
      email: 'samsung@samsung.com.tr',
      city: 'İstanbul',
      balance: -45000,
    },
    {
      id: 'cnt-s02',
      name: 'Dell Türkiye Distribütör',
      type: 'SUPPLIER',
      tax: '2020202020',
      phone: '+90 212 555 2002',
      email: 'dell@dell.com.tr',
      city: 'İstanbul',
      balance: -28500,
    },
    {
      id: 'cnt-s03',
      name: 'Logitech Tedarik Ltd.',
      type: 'SUPPLIER',
      tax: '3030303030',
      phone: '+90 216 555 2003',
      email: 'logitech@lg.com.tr',
      city: 'İstanbul',
      balance: -12300,
    },
  ];
  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { id: c.id },
      update: { balance: c.balance },
      create: {
        id: c.id,
        tenantId: 'ten-b1',
        name: c.name,
        type: c.type as any,
        taxNo: c.tax,
        phone: c.phone,
        email: c.email,
        city: c.city,
        balance: c.balance,
        isActive: true,
      },
    });
  }
  cliLog(`✓ ${contacts.length} cari`);

  const portalPw = await argon2.hash('Portal2026!');
  await prisma.contact.update({
    where: { id: 'cnt-01' },
    data: { portalEnabled: true, portalPassword: portalPw },
  });
  cliLog('✓ B2B portal: abc@abc.com / Portal2026!');

  // ─── INVOICES ────────────────────────────────────────────────────────
  const invoices = [
    {
      id: 'inv-01',
      num: 1,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-01',
      date: daysAgo(45),
      due: daysAgo(15),
      lines: [
        { pid: 'prod-01', desc: 'Laptop Dell Inspiron 15', qty: 2, up: 16500 },
        { pid: 'prod-03', desc: 'Klavye Logitech MX Keys', qty: 2, up: 1200 },
      ],
      payments: [
        {
          id: 'pay-01',
          type: 'WIRE',
          amt: 36000,
          ref: 'EFT-2026-001',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(10),
        },
      ],
    },
    {
      id: 'inv-02',
      num: 2,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-02',
      date: daysAgo(42),
      due: daysAgo(12),
      lines: [
        { pid: 'prod-02', desc: 'Monitor Samsung 27"', qty: 2, up: 6200 },
        { pid: 'prod-01', desc: 'Laptop Dell', qty: 1, up: 16500 },
      ],
      payments: [],
    },
    {
      id: 'inv-03',
      num: 3,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-03',
      date: daysAgo(38),
      due: daysAgo(8),
      lines: [
        { pid: 'prod-03', desc: 'Klavye Logitech', qty: 5, up: 1200 },
        { pid: 'prod-04', desc: 'Mouse Logitech', qty: 5, up: 950 },
      ],
      payments: [
        {
          id: 'pay-03',
          type: 'CASH',
          amt: 2160,
          ref: 'KSA-2026-001',
          kid: 'ksa-01',
          bid: null,
          at: daysAgo(7),
        },
      ],
    },
    {
      id: 'inv-04',
      num: 4,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-04',
      date: daysAgo(30),
      due: daysAgo(0),
      lines: [
        { pid: 'prod-08', desc: 'Switch 24 Port Cisco', qty: 1, up: 7800 },
        { pid: 'prod-09', desc: 'Router Mikrotik', qty: 1, up: 3200 },
      ],
      payments: [
        {
          id: 'pay-04',
          type: 'WIRE',
          amt: 6000,
          ref: 'EFT-2026-004',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(5),
        },
      ],
    },
    {
      id: 'inv-05',
      num: 5,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-05',
      date: daysAgo(25),
      due: daysLater(5),
      lines: [
        { pid: 'prod-01', desc: 'Laptop Dell Inspiron 15', qty: 3, up: 16500 },
        { pid: 'prod-07', desc: 'RAM 16GB DDR4', qty: 3, up: 1400 },
      ],
      payments: [
        {
          id: 'pay-05',
          type: 'WIRE',
          amt: 25000,
          ref: 'EFT-2026-005',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(2),
        },
      ],
    },
    {
      id: 'inv-06',
      num: 6,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-06',
      date: daysAgo(20),
      due: daysLater(10),
      lines: [
        { pid: 'prod-13', desc: 'Office 365 Business', qty: 10, up: 750 },
        { pid: 'prod-14', desc: 'Antivirüs 1 Yıl', qty: 10, up: 280 },
      ],
      payments: [],
    },
    {
      id: 'inv-07',
      num: 7,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-07',
      date: daysAgo(18),
      due: daysLater(12),
      lines: [
        { pid: 'prod-10', desc: 'Access Point Ubiquiti', qty: 5, up: 2200 },
        { pid: 'prod-08', desc: 'Switch 24 Port', qty: 2, up: 7800 },
      ],
      payments: [
        {
          id: 'pay-07',
          type: 'WIRE',
          amt: 10000,
          ref: 'EFT-2026-007',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(3),
        },
      ],
    },
    {
      id: 'inv-08',
      num: 8,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-08',
      date: daysAgo(15),
      due: daysLater(15),
      lines: [
        { pid: 'prod-06', desc: 'SSD 1TB Samsung', qty: 4, up: 2100 },
        { pid: 'prod-07', desc: 'RAM 16GB', qty: 4, up: 1400 },
      ],
      payments: [],
    },
    {
      id: 'inv-09',
      num: 9,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-09',
      date: daysAgo(12),
      due: daysLater(18),
      lines: [
        { pid: 'prod-11', desc: 'A4 Kağıt 500 Yaprak', qty: 20, up: 75 },
        { pid: 'prod-12', desc: 'Kalem Seti 12li', qty: 15, up: 35 },
      ],
      payments: [
        {
          id: 'pay-09',
          type: 'CASH',
          amt: 1500,
          ref: 'KSA-2026-002',
          kid: 'ksa-01',
          bid: null,
          at: daysAgo(10),
        },
      ],
    },
    {
      id: 'inv-10',
      num: 10,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-10',
      date: daysAgo(10),
      due: daysLater(20),
      lines: [
        { pid: 'prod-15', desc: 'Teknik Destek Saati', qty: 10, up: 450 },
        { pid: 'prod-13', desc: 'Office 365', qty: 5, up: 750 },
      ],
      payments: [],
    },
    {
      id: 'inv-11',
      num: 11,
      type: 'SALES',
      status: 'APPROVED',
      cid: 'cnt-01',
      date: daysAgo(7),
      due: daysLater(23),
      lines: [
        { pid: 'prod-05', desc: 'UPS 650VA APC', qty: 3, up: 1800 },
        { pid: 'prod-06', desc: 'SSD 1TB', qty: 2, up: 2100 },
      ],
      payments: [
        {
          id: 'pay-11',
          type: 'CARD',
          amt: 9600,
          ref: 'POS-2026-001',
          kid: null,
          bid: null,
          at: daysAgo(6),
        },
      ],
    },
    {
      id: 'inv-12',
      num: 12,
      type: 'SALES',
      status: 'DRAFT',
      cid: 'cnt-02',
      date: daysAgo(3),
      due: daysLater(27),
      lines: [{ pid: 'prod-01', desc: 'Laptop Dell', qty: 2, up: 16500 }],
      payments: [],
    },
    {
      id: 'inv-13',
      num: 13,
      type: 'SALES',
      status: 'DRAFT',
      cid: 'cnt-05',
      date: daysAgo(1),
      due: daysLater(29),
      lines: [{ pid: 'prod-08', desc: 'Switch 24 Port', qty: 3, up: 7800 }],
      payments: [],
    },
    // Alış faturaları
    {
      id: 'inv-p01',
      num: 1,
      type: 'PURCHASE',
      status: 'APPROVED',
      cid: 'cnt-s01',
      date: daysAgo(50),
      due: daysAgo(20),
      lines: [{ pid: 'prod-02', desc: 'Monitor Samsung 27" × 20 adet', qty: 20, up: 4500 }],
      payments: [
        {
          id: 'pay-p01',
          type: 'WIRE',
          amt: 90000,
          ref: 'EFT-TEDArik-001',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(18),
        },
      ],
    },
    {
      id: 'inv-p02',
      num: 2,
      type: 'PURCHASE',
      status: 'APPROVED',
      cid: 'cnt-s02',
      date: daysAgo(40),
      due: daysAgo(10),
      lines: [{ pid: 'prod-01', desc: 'Laptop Dell Inspiron × 30 adet', qty: 30, up: 12000 }],
      payments: [
        {
          id: 'pay-p02',
          type: 'WIRE',
          amt: 360000,
          ref: 'EFT-TEDArik-002',
          kid: null,
          bid: 'bnk-01',
          at: daysAgo(8),
        },
      ],
    },
  ];

  let iNo = 1;
  for (const inv of invoices) {
    const sub = inv.lines.reduce((s, l) => s + l.qty * l.up, 0);
    const vat = sub * 0.2;
    const total = sub + vat;
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        tenantId: 'ten-b1',
        type: inv.type as any,
        status: inv.status as any,
        series: inv.type === 'PURCHASE' ? 'ALIS' : 'SNX',
        number: inv.num,
        date: inv.date,
        dueDate: inv.due,
        contactId: inv.cid,
        subtotal: sub,
        vatTotal: vat,
        total,
      },
    });
    for (let i = 0; i < inv.lines.length; i++) {
      const l = inv.lines[i];
      const lv = l.qty * l.up * 0.2;
      const lt = l.qty * l.up;
      await prisma.invoiceLine.upsert({
        where: { id: `${inv.id}-l${i + 1}` },
        update: {},
        create: {
          id: `${inv.id}-l${i + 1}`,
          invoiceId: inv.id,
          productId: l.pid,
          description: l.desc,
          quantity: l.qty,
          unitPrice: l.up,
          vatRate: 20,
          vatAmount: lv,
          total: lt + lv,
        },
      });
    }
    for (const p of inv.payments) {
      await prisma.invoicePayment.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          tenantId: 'ten-b1',
          invoiceId: inv.id,
          paymentType: p.type as any,
          amount: p.amt,
          cashAccountId: p.kid ?? undefined,
          bankAccountId: p.bid ?? undefined,
          reference: p.ref,
          paidAt: p.at,
        },
      });
    }
  }
  cliLog(`✓ ${invoices.length} fatura`);

  // ─── CASH TRANSACTIONS ───────────────────────────────────────────────
  const cashTx = [
    {
      id: 'ctx-01',
      type: 'INCOME',
      amt: 15000,
      desc: 'Müşteri tahsilatı - ABC Teknoloji',
      ref: 'TAH-001',
      cid: 'cnt-01',
      day: 28,
    },
    {
      id: 'ctx-02',
      type: 'EXPENSE',
      amt: 3200,
      desc: 'Ofis kira ödemesi Ocak',
      ref: 'KRA-001',
      cid: null,
      day: 27,
    },
    {
      id: 'ctx-03',
      type: 'INCOME',
      amt: 8500,
      desc: 'Müşteri tahsilatı - XYZ Danışmanlık',
      ref: 'TAH-002',
      cid: 'cnt-02',
      day: 25,
    },
    {
      id: 'ctx-04',
      type: 'EXPENSE',
      amt: 1200,
      desc: 'Elektrik faturası',
      ref: 'ELK-001',
      cid: null,
      day: 24,
    },
    {
      id: 'ctx-05',
      type: 'INCOME',
      amt: 4500,
      desc: 'Perakende satış geliri',
      ref: 'TAH-003',
      cid: null,
      day: 22,
    },
    {
      id: 'ctx-06',
      type: 'EXPENSE',
      amt: 650,
      desc: 'İnternet & telefon faturası',
      ref: 'TEL-001',
      cid: null,
      day: 20,
    },
    {
      id: 'ctx-07',
      type: 'INCOME',
      amt: 12000,
      desc: 'Müşteri tahsilatı - Güneş Otelcilik',
      ref: 'TAH-004',
      cid: 'cnt-04',
      day: 18,
    },
    {
      id: 'ctx-08',
      type: 'EXPENSE',
      amt: 2800,
      desc: 'Personel ikramiye ödemesi',
      ref: 'IKR-001',
      cid: null,
      day: 15,
    },
    {
      id: 'ctx-09',
      type: 'INCOME',
      amt: 3200,
      desc: 'Teknik servis geliri',
      ref: 'TAH-005',
      cid: 'cnt-06',
      day: 13,
    },
    {
      id: 'ctx-10',
      type: 'EXPENSE',
      amt: 980,
      desc: 'Temizlik & bakım gideri',
      ref: 'BKM-001',
      cid: null,
      day: 10,
    },
    {
      id: 'ctx-11',
      type: 'INCOME',
      amt: 7200,
      desc: 'Stok satış tahsilatı',
      ref: 'TAH-006',
      cid: null,
      day: 8,
    },
    {
      id: 'ctx-12',
      type: 'EXPENSE',
      amt: 5500,
      desc: 'Depo kira ödemesi',
      ref: 'KRA-002',
      cid: null,
      day: 5,
    },
  ];
  for (const t of cashTx) {
    await prisma.cashTransaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        tenantId: 'ten-b1',
        cashAccountId: 'ksa-01',
        type: t.type as any,
        amount: t.amt,
        description: t.desc,
        reference: t.ref,
        contactId: t.cid ?? undefined,
        createdAt: daysAgo(t.day),
      },
    });
  }

  // ─── BANK TRANSACTIONS ───────────────────────────────────────────────
  const bankTx = [
    {
      id: 'btx-01',
      type: 'INCOME',
      amt: 36000,
      desc: 'EFT geliri - ABC Teknoloji',
      ref: 'EFT-001',
      cid: 'cnt-01',
      day: 10,
    },
    {
      id: 'btx-02',
      type: 'EXPENSE',
      amt: 90000,
      desc: 'Tedarikçi ödemesi - Samsung',
      ref: 'EFT-002',
      cid: 'cnt-s01',
      day: 18,
    },
    {
      id: 'btx-03',
      type: 'INCOME',
      amt: 25000,
      desc: 'EFT geliri - Ege Mimarlık',
      ref: 'EFT-003',
      cid: 'cnt-05',
      day: 2,
    },
    {
      id: 'btx-04',
      type: 'EXPENSE',
      amt: 360000,
      desc: 'Tedarikçi ödemesi - Dell Türkiye',
      ref: 'EFT-004',
      cid: 'cnt-s02',
      day: 8,
    },
    {
      id: 'btx-05',
      type: 'INCOME',
      amt: 10000,
      desc: 'Kısmi tahsilat - Mega Lojistik',
      ref: 'EFT-005',
      cid: 'cnt-07',
      day: 3,
    },
    {
      id: 'btx-06',
      type: 'EXPENSE',
      amt: 8500,
      desc: 'Maaş ödemesi Haziran',
      ref: 'MAA-001',
      cid: null,
      day: 1,
    },
    {
      id: 'btx-07',
      type: 'INCOME',
      amt: 6000,
      desc: 'EFT geliri - Güneş Otelcilik',
      ref: 'EFT-006',
      cid: 'cnt-04',
      day: 5,
    },
    {
      id: 'btx-08',
      type: 'EXPENSE',
      amt: 12000,
      desc: 'Vergi ödemesi KDV',
      ref: 'KDV-001',
      cid: null,
      day: 12,
    },
    {
      id: 'btx-09',
      type: 'INCOME',
      amt: 9600,
      desc: 'POS pos geliri Haziran',
      ref: 'POS-001',
      cid: null,
      day: 6,
    },
    {
      id: 'btx-10',
      type: 'EXPENSE',
      amt: 4500,
      desc: 'Sigorta prim ödemesi',
      ref: 'SGR-001',
      cid: null,
      day: 15,
    },
    {
      id: 'btx-11',
      type: 'INCOME',
      amt: 14200,
      desc: 'EFT geliri - Mega Lojistik',
      ref: 'EFT-007',
      cid: 'cnt-07',
      day: 4,
    },
    {
      id: 'btx-12',
      type: 'EXPENSE',
      amt: 3200,
      desc: 'Kira ödemesi',
      ref: 'KRA-003',
      cid: null,
      day: 7,
    },
  ];
  for (const t of bankTx) {
    await prisma.bankTransaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        tenantId: 'ten-b1',
        bankAccountId: 'bnk-01',
        type: t.type as any,
        amount: t.amt,
        description: t.desc,
        reference: t.ref,
        contactId: t.cid ?? undefined,
        createdAt: daysAgo(t.day),
      },
    });
  }

  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };
  const checks = [
    {
      id: 'chk-01',
      type: 'INCOME' as const,
      amt: 18500,
      checkNo: 'CHK-2026-001',
      cid: 'cnt-01',
      due: 7,
      status: 'PENDING' as const,
      desc: 'ABC Teknoloji çeki',
    },
    {
      id: 'chk-02',
      type: 'INCOME' as const,
      amt: 9200,
      checkNo: 'CHK-2026-002',
      cid: 'cnt-04',
      due: 14,
      status: 'PENDING' as const,
      desc: 'Güneş Otelcilik çeki',
    },
    {
      id: 'chk-03',
      type: 'INCOME' as const,
      amt: 5600,
      checkNo: 'CHK-2026-003',
      cid: 'cnt-07',
      due: -3,
      status: 'PENDING' as const,
      desc: 'Mega Lojistik — vadesi geçmiş',
    },
    {
      id: 'chk-04',
      type: 'EXPENSE' as const,
      amt: 12000,
      checkNo: 'CHK-2026-004',
      cid: 'cnt-s01',
      due: 21,
      status: 'PENDING' as const,
      desc: 'Samsung tedarikçi çeki',
    },
    {
      id: 'chk-05',
      type: 'INCOME' as const,
      amt: 7500,
      checkNo: 'CHK-2026-005',
      cid: 'cnt-02',
      due: 45,
      status: 'PENDING' as const,
      desc: 'XYZ Danışmanlık çeki',
    },
    {
      id: 'chk-06',
      type: 'INCOME' as const,
      amt: 3200,
      checkNo: 'CHK-2025-099',
      cid: 'cnt-06',
      due: -15,
      status: 'CLEARED' as const,
      desc: 'Tahsil edilmiş çek',
    },
  ];
  for (const c of checks) {
    await prisma.bankTransaction.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        tenantId: 'ten-b1',
        bankAccountId: 'bnk-01',
        type: c.type,
        amount: c.amt,
        description: c.desc,
        checkNo: c.checkNo,
        checkStatus: c.status,
        dueDate: daysFromNow(c.due),
        contactId: c.cid,
        reference: c.checkNo,
        createdAt: daysAgo(Math.abs(c.due) + 5),
      },
    });
  }
  cliLog(`✓ Kasa & banka işlemleri (+ ${checks.length} çek)`);

  // ─── POS SESSION ─────────────────────────────────────────────────────
  await prisma.pOSSession.upsert({
    where: { id: 'sess-01' },
    update: {},
    create: {
      id: 'sess-01',
      tenantId: 'ten-b1',
      userId: 'usr-b1',
      openingCash: 5000,
      openedAt: daysAgo(1),
    },
  });

  // ─── TMS VEHICLES ────────────────────────────────────────────────────
  const vehicles = [
    { id: 'veh-01', plate: '34 ABC 001', brand: 'Ford', model: 'Transit', type: 'VAN' },
    { id: 'veh-02', plate: '34 ABC 002', brand: 'Mercedes', model: 'Sprinter', type: 'VAN' },
    { id: 'veh-03', plate: '34 TIR 001', brand: 'Volvo', model: 'FH16', type: 'TRUCK' },
    { id: 'veh-04', plate: '06 ABC 003', brand: 'Renault', model: 'Master', type: 'VAN' },
  ];
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        tenantId: 'ten-b1',
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        type: v.type,
        isActive: true,
      },
    });
  }

  // ─── TMS SHIPMENTS ───────────────────────────────────────────────────
  const shipments = [
    {
      id: 'shp-01',
      code: 'SHP-2026-001',
      vid: 'veh-01',
      status: 'DELIVERED',
      route: 'İstanbul Ana Depo → ABC Teknoloji Levent',
      day: 43,
    },
    {
      id: 'shp-02',
      code: 'SHP-2026-002',
      vid: 'veh-01',
      status: 'DELIVERED',
      route: 'İstanbul Ana Depo → Güneş Otelcilik Taksim',
      day: 28,
    },
    {
      id: 'shp-03',
      code: 'SHP-2026-003',
      vid: 'veh-03',
      did: 'usr-sof',
      status: 'IN_TRANSIT',
      route: 'İstanbul Ana Depo → Ege Mimarlık İzmir',
      day: 3,
    },
    {
      id: 'shp-04',
      code: 'SHP-2026-004',
      vid: 'veh-02',
      did: 'usr-sof',
      status: 'PREPARED',
      route: 'İstanbul Ana Depo → Mega Lojistik Bağcılar',
      day: 1,
    },
    {
      id: 'shp-05',
      code: 'SHP-2026-005',
      vid: null,
      did: 'usr-sof',
      status: 'PLANNED',
      route: 'İstanbul Ana Depo → Star Mühendislik Ankara',
      day: 0,
    },
    {
      id: 'shp-06',
      code: 'SHP-2026-006',
      vid: 'veh-02',
      status: 'DELIVERED',
      route: 'İstanbul Ana Depo → XYZ Danışmanlık Maslak',
      day: 40,
    },
    {
      id: 'shp-07',
      code: 'SHP-2026-007',
      vid: 'veh-01',
      status: 'DELIVERED',
      route: 'İstanbul Ana Depo → Delta Yazılım Ümraniye',
      day: 18,
    },
    {
      id: 'shp-08',
      code: 'SHP-2026-008',
      vid: 'veh-03',
      did: 'usr-sof',
      status: 'IN_TRANSIT',
      route: 'İstanbul Ana Depo → Pro İnşaat Ankara',
      day: 2,
    },
  ];
  for (const s of shipments) {
    await prisma.shipment.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        tenantId: 'ten-b1',
        code: s.code,
        vehicleId: s.vid ?? undefined,
        driverId: (s as any).did ?? undefined,
        status: s.status as any,
        route: s.route,
        ...(s.status === 'DELIVERED' && { deliveredAt: daysAgo(Math.max(s.day - 2, 0)) }),
        ...(s.status !== 'PLANNED' && { plannedDate: daysAgo(s.day) }),
      },
    });
  }
  cliLog(`✓ ${vehicles.length} araç, ${shipments.length} sevkiyat`);

  // B2B Customers model not in schema — skipped

  // ─── B2B ORDERS ──────────────────────────────────────────────────────
  const b2bOrders = [
    {
      id: 'b2bo-01',
      cid: 'cnt-01',
      code: 'B2B-2026-001',
      status: 'APPROVED',
      day: 20,
      lines: [
        { pid: 'prod-01', qty: 3, up: 15000 },
        { pid: 'prod-06', qty: 5, up: 1900 },
      ],
    },
    {
      id: 'b2bo-02',
      cid: 'cnt-04',
      code: 'B2B-2026-002',
      status: 'APPROVED',
      day: 15,
      lines: [
        { pid: 'prod-08', qty: 2, up: 7000 },
        { pid: 'prod-09', qty: 2, up: 2900 },
      ],
    },
    {
      id: 'b2bo-03',
      cid: 'cnt-05',
      code: 'B2B-2026-003',
      status: 'PENDING',
      day: 8,
      lines: [
        { pid: 'prod-01', qty: 5, up: 15000 },
        { pid: 'prod-07', qty: 10, up: 1200 },
      ],
    },
    {
      id: 'b2bo-04',
      cid: 'cnt-07',
      code: 'B2B-2026-004',
      status: 'PENDING',
      day: 5,
      lines: [
        { pid: 'prod-10', qty: 8, up: 2000 },
        { pid: 'prod-08', qty: 1, up: 7000 },
      ],
    },
    {
      id: 'b2bo-05',
      cid: 'cnt-10',
      code: 'B2B-2026-005',
      status: 'SHIPPED',
      day: 12,
      lines: [
        { pid: 'prod-15', qty: 20, up: 400 },
        { pid: 'prod-13', qty: 10, up: 680 },
      ],
    },
    {
      id: 'b2bo-06',
      cid: 'cnt-01',
      code: 'B2B-2026-006',
      status: 'DELIVERED',
      day: 30,
      lines: [
        { pid: 'prod-02', qty: 4, up: 5700 },
        { pid: 'prod-04', qty: 8, up: 850 },
      ],
    },
    {
      id: 'b2bo-07',
      cid: 'cnt-05',
      code: 'B2B-2026-007',
      status: 'APPROVED',
      day: 3,
      lines: [{ pid: 'prod-06', qty: 6, up: 1900 }],
    },
  ];
  for (const o of b2bOrders) {
    const sub = o.lines.reduce((s, l) => s + l.qty * l.up, 0);
    const vat = sub * 0.2;
    await prisma.b2BOrder.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        tenantId: 'ten-b1',
        contactId: o.cid,
        code: o.code,
        status: o.status as any,
        subtotal: sub,
        vatTotal: vat,
        total: sub + vat,
        requestedAt: daysAgo(o.day),
        ...(o.status !== 'PENDING' && { approvedAt: daysAgo(o.day - 1) }),
      },
    });
    for (let i = 0; i < o.lines.length; i++) {
      const l = o.lines[i];
      await prisma.b2BOrderLine.upsert({
        where: { id: `${o.id}-l${i + 1}` },
        update: {},
        create: {
          id: `${o.id}-l${i + 1}`,
          orderId: o.id,
          productId: l.pid,
          quantity: l.qty,
          unitPrice: l.up,
          total: l.qty * l.up,
        },
      });
    }
  }
  cliLog(`✓ ${b2bOrders.length} B2B sipariş`);

  // ─── STOCK TRANSFERS ────────────────────────────────────────────────
  const transfers = [
    {
      id: 'tr-01',
      from: 'wh-01',
      to: 'wh-02',
      status: 'RECEIVED',
      day: 20,
      items: [
        { pid: 'prod-03', qty: 20 },
        { pid: 'prod-04', qty: 15 },
      ],
    },
    {
      id: 'tr-02',
      from: 'wh-01',
      to: 'wh-s1',
      status: 'RECEIVED',
      day: 15,
      items: [
        { pid: 'prod-01', qty: 5 },
        { pid: 'prod-06', qty: 10 },
      ],
    },
    {
      id: 'tr-03',
      from: 'wh-01',
      to: 'wh-02',
      status: 'SHIPPED',
      day: 2,
      items: [
        { pid: 'prod-11', qty: 50 },
        { pid: 'prod-12', qty: 30 },
      ],
    },
    {
      id: 'tr-04',
      from: 'wh-02',
      to: 'wh-s1',
      status: 'PENDING',
      day: 0,
      items: [{ pid: 'prod-03', qty: 10 }],
    },
    {
      id: 'tr-05',
      from: 'wh-01',
      to: 'wh-02',
      status: 'APPROVED',
      day: 1,
      items: [{ pid: 'prod-07', qty: 25 }],
    },
    {
      id: 'tr-06',
      from: 'wh-02',
      to: 'wh-01',
      status: 'RECEIVED',
      day: 12,
      items: [{ pid: 'prod-02', qty: 8 }],
    },
    {
      id: 'tr-07',
      from: 'wh-01',
      to: 'wh-s1',
      status: 'SHIPPED',
      day: 3,
      items: [{ pid: 'prod-05', qty: 6 }],
    },
    {
      id: 'tr-08',
      from: 'wh-01',
      to: 'wh-02',
      status: 'DRAFT',
      day: 0,
      items: [{ pid: 'prod-08', qty: 4 }],
    },
    {
      id: 'tr-09',
      from: 'wh-02',
      to: 'wh-01',
      status: 'PENDING',
      day: 1,
      items: [{ pid: 'prod-09', qty: 3 }],
    },
    {
      id: 'tr-10',
      from: 'wh-01',
      to: 'wh-s1',
      status: 'APPROVED',
      day: 2,
      items: [{ pid: 'prod-10', qty: 12 }],
    },
  ];
  for (const t of transfers) {
    await prisma.stockTransfer.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        fromTenantId: 'ten-b1',
        toTenantId: 'ten-b1',
        fromWarehouseId: t.from,
        toWarehouseId: t.to,
        status: t.status as any,
        createdById: 'usr-dep',
        requestedAt: daysAgo(t.day),
      },
    });
    for (let i = 0; i < t.items.length; i++) {
      const item = t.items[i];
      await prisma.stockTransferLine.upsert({
        where: { id: `${t.id}-i${i + 1}` },
        update: {},
        create: {
          id: `${t.id}-i${i + 1}`,
          transferId: t.id,
          productId: item.pid,
          quantity: item.qty,
          sentQty: t.status === 'RECEIVED' ? item.qty : 0,
          receivedQty: t.status === 'RECEIVED' ? item.qty : 0,
        },
      });
    }
  }

  // ─── SUPPORT TICKETS ────────────────────────────────────────────────
  const tickets = [
    {
      id: 'tkt-01',
      tid: 'ten-b1',
      subject: 'POS yazıcı bağlantı sorunu',
      body: 'Termal yazıcı tanınmıyor.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      day: 5,
    },
    {
      id: 'tkt-02',
      tid: 'ten-b2',
      subject: 'Fatura numarası sıfırlanıyor',
      body: 'Her ay sıfırlanıyor.',
      priority: 'MEDIUM',
      status: 'OPEN',
      day: 3,
    },
    {
      id: 'tkt-03',
      tid: 'ten-b1',
      subject: 'KDV raporu yanlış hesaplıyor',
      body: 'Oran sorunu var.',
      priority: 'HIGH',
      status: 'OPEN',
      day: 2,
    },
    {
      id: 'tkt-04',
      tid: 'ten-d1',
      subject: 'Yeni işletme oluşturma hatası',
      body: 'Kaydet diyince hata veriyor.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      day: 8,
    },
    {
      id: 'tkt-05',
      tid: 'ten-b3',
      subject: 'Entegrasyon API sorusu',
      body: 'REST API dökümantasyon lazım.',
      priority: 'LOW',
      status: 'OPEN',
      day: 1,
    },
    {
      id: 'tkt-06',
      tid: 'ten-b1',
      subject: 'Stok sayımı aktarım hatası',
      body: 'Excel aktarımı çalışmıyor.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      day: 4,
    },
    {
      id: 'tkt-07',
      tid: 'ten-b5',
      subject: 'TMS Araç takip özelliği',
      body: 'Harita entegrasyonu ne zaman?',
      priority: 'LOW',
      status: 'OPEN',
      day: 0,
    },
    {
      id: 'tkt-08',
      tid: 'ten-b2',
      subject: 'E-Fatura GİB bağlantısı',
      body: 'Test hesabı nasıl tanımlanır?',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      day: 6,
    },
  ];
  for (const t of tickets) {
    const ticket = await prisma.supportTicket.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        tenantId: t.tid,
        subject: t.subject,
        priority: t.priority as any,
        status: t.status as any,
        createdAt: daysAgo(t.day),
      },
    });
    await prisma.ticketMessage.upsert({
      where: { id: `${t.id}-m1` },
      update: {},
      create: {
        id: `${t.id}-m1`,
        ticketId: t.id,
        senderId: 'usr-root',
        body: t.body,
        createdAt: daysAgo(t.day),
      },
    });
  }
  cliLog(`✓ ${tickets.length} destek talebi`);

  // ─── MESSAGES ───────────────────────────────────────────────────────
  const messages = [
    {
      id: 'msg-01',
      from: 'ten-root',
      title: 'Sistem bakımı bildirimi',
      body: '22 Haziran 02:00-04:00 arası bakım yapılacak.',
      target: 'ten-d1',
    },
    {
      id: 'msg-02',
      from: 'ten-d1',
      title: 'Abonelik yenileme hatırlatması',
      body: 'Aboneliğiniz 30 gün içinde sona erecek.',
      target: 'ten-b1',
    },
    {
      id: 'msg-03',
      from: 'ten-root',
      title: 'Yeni özellik duyurusu',
      body: 'B2B portal güncellendi, changelog ektedir.',
      target: 'ten-d2',
    },
    {
      id: 'msg-04',
      from: 'ten-d1',
      title: 'Ödeme hatırlatması',
      body: 'Haziran abonelik ödemesi bekleniyor.',
      target: 'ten-b3',
    },
    {
      id: 'msg-05',
      from: 'ten-root',
      title: 'Platinum plan avantajları',
      body: 'AI modülleriniz aktif edildi.',
      target: 'ten-b5',
    },
    {
      id: 'msg-06',
      from: 'ten-d2',
      title: 'Kurulum rehberi',
      body: 'SmartNexus kurulum videoları ekte.',
      target: 'ten-b6',
    },
  ];
  for (const m of messages) {
    const created = await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: { id: m.id, fromTenantId: m.from, title: m.title, body: m.body, sentAt: new Date() },
    });
    await prisma.messageRecipient.upsert({
      where: { messageId_tenantId: { messageId: m.id, tenantId: m.target } },
      update: {},
      create: { messageId: m.id, tenantId: m.target },
    });
  }

  // ─── PLAN TEMPLATES ──────────────────────────────────────────────────
  const planTemplates = [
    {
      plan: 'BASIC',
      mods: BASIC_MODULES,
      price: 499,
      desc: 'Küçük işletmeler için temel modüller',
    },
    {
      plan: 'PROFESSIONAL',
      mods: PRO_MODULES,
      price: 1499,
      desc: 'Büyüyen işletmeler için genişletilmiş paket',
    },
    {
      plan: 'PLATINUM',
      mods: PLATINUM_MODULES,
      price: 2999,
      desc: 'Kurumsal — tüm modüller dahil',
    },
  ];
  for (const pt of planTemplates) {
    await prisma.planTemplate.upsert({
      where: { plan: pt.plan as any },
      update: { modules: pt.mods, price: pt.price, description: pt.desc },
      create: { plan: pt.plan as any, modules: pt.mods, price: pt.price, description: pt.desc },
    });
  }
  cliLog(`✓ ${planTemplates.length} paket şablonu`);

  // ─── PRICE LISTS ─────────────────────────────────────────────────────
  const priceLists = [
    {
      id: 'pl-01',
      name: 'Perakende Fiyat Listesi',
      default: true,
      items: [
        ['prod-01', 16500],
        ['prod-02', 6200],
        ['prod-03', 1200],
        ['prod-04', 950],
        ['prod-05', 1800],
        ['prod-06', 2100],
        ['prod-07', 1400],
        ['prod-08', 7800],
        ['prod-09', 3200],
        ['prod-10', 2200],
        ['prod-11', 75],
        ['prod-12', 35],
      ],
    },
    {
      id: 'pl-02',
      name: 'Bayi Fiyat Listesi',
      default: false,
      items: [
        ['prod-01', 15000],
        ['prod-02', 5700],
        ['prod-03', 1050],
        ['prod-04', 850],
        ['prod-05', 1650],
        ['prod-06', 1900],
        ['prod-07', 1200],
        ['prod-08', 7000],
        ['prod-09', 2900],
        ['prod-10', 2000],
        ['prod-11', 65],
        ['prod-12', 30],
      ],
    },
    {
      id: 'pl-03',
      name: 'Kurumsal Fiyat Listesi',
      default: false,
      items: [
        ['prod-01', 14200],
        ['prod-02', 5400],
        ['prod-03', 980],
        ['prod-04', 780],
        ['prod-05', 1550],
        ['prod-06', 1750],
        ['prod-07', 1100],
        ['prod-08', 6600],
        ['prod-09', 2700],
        ['prod-10', 1850],
        ['prod-13', 680],
        ['prod-14', 250],
      ],
    },
  ];
  for (const pl of priceLists) {
    await prisma.priceList.upsert({
      where: { id: pl.id },
      update: {},
      create: {
        id: pl.id,
        tenantId: 'ten-b1',
        name: pl.name,
        currency: 'TRY',
        isDefault: pl.default,
      },
    });
    for (let i = 0; i < pl.items.length; i++) {
      const [pid, price] = pl.items[i] as [string, number];
      await prisma.priceListItem.upsert({
        where: { priceListId_productId: { priceListId: pl.id, productId: pid } },
        update: { price },
        create: { priceListId: pl.id, productId: pid, price },
      });
    }
  }
  cliLog(`✓ ${priceLists.length} fiyat listesi`);

  // ─── STOCK MOVEMENTS ─────────────────────────────────────────────────
  const movements = [
    {
      id: 'mov-01',
      pid: 'prod-01',
      wh: 'wh-01',
      type: 'IN',
      qty: 50,
      day: 60,
      ref: 'GRN-001',
      desc: 'Açılış stoku',
    },
    {
      id: 'mov-02',
      pid: 'prod-02',
      wh: 'wh-01',
      type: 'IN',
      qty: 40,
      day: 58,
      ref: 'GRN-002',
      desc: 'Açılış stoku',
    },
    {
      id: 'mov-03',
      pid: 'prod-01',
      wh: 'wh-01',
      type: 'OUT',
      qty: 5,
      day: 45,
      ref: 'INV-001',
      desc: 'Satış çıkışı',
    },
    {
      id: 'mov-04',
      pid: 'prod-03',
      wh: 'wh-01',
      type: 'IN',
      qty: 150,
      day: 40,
      ref: 'GRN-003',
      desc: 'Tedarik girişi',
    },
    {
      id: 'mov-05',
      pid: 'prod-06',
      wh: 'wh-01',
      type: 'IN',
      qty: 80,
      day: 35,
      ref: 'GRN-004',
      desc: 'SSD alımı',
    },
    {
      id: 'mov-06',
      pid: 'prod-08',
      wh: 'wh-01',
      type: 'OUT',
      qty: 3,
      day: 30,
      ref: 'INV-004',
      desc: 'Satış çıkışı',
    },
    {
      id: 'mov-07',
      pid: 'prod-11',
      wh: 'wh-01',
      type: 'IN',
      qty: 500,
      day: 25,
      ref: 'GRN-005',
      desc: 'Ofis malzemesi',
    },
    {
      id: 'mov-08',
      pid: 'prod-01',
      wh: 'wh-02',
      type: 'TRANSFER_IN',
      qty: 12,
      day: 20,
      ref: 'TR-01',
      desc: 'Transfer girişi',
    },
    {
      id: 'mov-09',
      pid: 'prod-04',
      wh: 'wh-01',
      type: 'OUT',
      qty: 10,
      day: 15,
      ref: 'POS-001',
      desc: 'POS satış',
    },
    {
      id: 'mov-10',
      pid: 'prod-07',
      wh: 'wh-01',
      type: 'ADJUSTMENT',
      qty: -2,
      day: 10,
      ref: 'CNT-001',
      desc: 'Sayım düzeltme',
    },
    {
      id: 'mov-11',
      pid: 'prod-05',
      wh: 'wh-01',
      type: 'IN',
      qty: 25,
      day: 8,
      ref: 'GRN-006',
      desc: 'UPS alımı',
    },
    {
      id: 'mov-12',
      pid: 'prod-10',
      wh: 'wh-02',
      type: 'OUT',
      qty: 4,
      day: 5,
      ref: 'INV-007',
      desc: 'Satış çıkışı',
    },
  ];
  for (const m of movements) {
    await prisma.stockMovement.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        tenantId: 'ten-b1',
        productId: m.pid,
        warehouseId: m.wh,
        type: m.type as any,
        quantity: m.qty,
        reference: m.ref,
        description: m.desc,
        userId: 'usr-dep',
        createdAt: daysAgo(m.day),
      },
    });
  }
  cliLog(`✓ ${movements.length} stok hareketi`);

  // ─── LEDGER (onaylı faturalar) ─────────────────────────────────────────
  const { DEFAULT_LEDGER_ACCOUNTS } = await import('../src/common/ledger-accounts');
  for (const acc of DEFAULT_LEDGER_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId: 'ten-b1', code: acc.code } },
      update: { name: acc.name, type: acc.type },
      create: { tenantId: 'ten-b1', code: acc.code, name: acc.name, type: acc.type },
    });
  }
  const approvedInvs = await prisma.invoice.findMany({
    where: { tenantId: 'ten-b1', status: { in: ['APPROVED', 'PAID'] as any } },
  });
  for (const inv of approvedInvs) {
    const exists = await prisma.journalEntry.findFirst({
      where: { tenantId: 'ten-b1', sourceType: 'INVOICE', sourceId: inv.id },
    });
    if (exists) continue;
    const accMap = Object.fromEntries(
      (
        await prisma.ledgerAccount.findMany({ where: { tenantId: 'ten-b1' } })
      ).map((a) => [a.code, a.id]),
    );
    const lines =
      inv.type === 'SALES'
        ? [
            { code: '120', debit: inv.total, credit: 0 },
            { code: '600', debit: 0, credit: inv.subtotal },
            ...(inv.vatTotal > 0 ? [{ code: '391', debit: 0, credit: inv.vatTotal }] : []),
          ]
        : inv.type === 'PURCHASE'
          ? [
              { code: '153', debit: inv.subtotal, credit: 0 },
              ...(inv.vatTotal > 0 ? [{ code: '191', debit: inv.vatTotal, credit: 0 }] : []),
              { code: '320', debit: 0, credit: inv.total },
            ]
          : [];
    if (!lines.length) continue;
    await prisma.journalEntry.create({
      data: {
        tenantId: 'ten-b1',
        description: `Fatura ${inv.series}-${inv.number}`,
        reference: `${inv.series}-${inv.number}`,
        sourceType: 'INVOICE',
        sourceId: inv.id,
        date: inv.date,
        lines: {
          create: lines.map((l) => ({
            accountId: accMap[l.code],
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
  }
  cliLog(`✓ Mizan kayıtları (${approvedInvs.length} fatura)`);

  // ─── PLATFORM: Addon modüller & kontör paketleri ─────────────────────
  const addonDefs = [
    { code: 'POS_YAZARKASA', name: 'Yazarkasa POS Modülü', description: 'Perakende satış ve fiş yazdırma', basePrice: 299, sortOrder: 1, isKontorBased: false },
    { code: 'API_ACCESS', name: 'Sistem API Modülü', description: 'REST API erişimi ve tenant API key', basePrice: 499, sortOrder: 2, isKontorBased: false },
    { code: 'MARKETPLACE', name: 'E-Pazaryeri Entegrasyon', description: 'Trendyol, Hepsiburada, Amazon', basePrice: 399, sortOrder: 3, isKontorBased: false },
    { code: 'EINVOICE', name: 'E-Fatura Modülü', description: 'GİB uyumlu e-Fatura gönderimi', basePrice: 199, sortOrder: 4, isKontorBased: true },
    { code: 'EARCHIVE', name: 'E-Arşiv Modülü', description: 'E-Arşiv fatura ve kontör', basePrice: 149, sortOrder: 5, isKontorBased: true },
    { code: 'SMS', name: 'SMS Bildirim', description: 'Netgsm SMS kontör', basePrice: 99, sortOrder: 6, isKontorBased: true },
  ] as const;

  for (const def of addonDefs) {
    const mod = await prisma.addonModule.upsert({
      where: { code: def.code },
      update: { name: def.name, description: def.description, basePrice: def.basePrice, sortOrder: def.sortOrder, isKontorBased: def.isKontorBased },
      create: { ...def, isActive: true },
    });

    if (!def.isKontorBased) continue;

    const pkgDefs = [
      { name: '500 Kontör', quantity: 500, unitPrice: 0.5 },
      { name: '1000 Kontör', quantity: 1000, unitPrice: 0.45 },
      { name: '2000 Kontör', quantity: 2000, unitPrice: 0.4 },
    ];
    for (const p of pkgDefs) {
      const existing = await prisma.kontorPackage.findFirst({
        where: { addonModuleId: mod.id, quantity: p.quantity },
      });
      if (!existing) {
        await prisma.kontorPackage.create({
          data: {
            addonModuleId: mod.id,
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: Math.round(p.quantity * p.unitPrice * 100) / 100,
          },
        });
      }
    }
  }
  cliLog('✓ Addon modüller & kontör paketleri');

  await prisma.platformNotification.create({
    data: {
      type: 'SYSTEM_ALERT',
      title: 'Platform hazır',
      body: 'SmartNexus çok panel mimarisi aktif — Nexus Admin, Bayi, İşletme.',
      isRead: false,
    },
  });

  cliLog('\n✅ Seed tamamlandı!\n');
  cliLog('  4 bayi | 8 işletme | 3 şube | 23 kullanıcı');
  cliLog('  15 ürün | 13 cari | 15 fatura | 4 araç | 8 sevkiyat');
  cliLog('  7 B2B sipariş | 10 transfer | 8 destek talebi');
  cliLog('  3 fiyat listesi | 12 stok hareketi | 3 paket şablonu');
}

main()
  .catch((e) => {
    cliError(`SEED HATA: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
