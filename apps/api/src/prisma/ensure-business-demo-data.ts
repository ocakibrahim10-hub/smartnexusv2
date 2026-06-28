import { PrismaClient } from '@prisma/client';

const DEMO_CATEGORIES = [
  { suffix: 'cat-pos-1', name: 'HIŞIR POŞET' },
  { suffix: 'cat-pos-2', name: 'KÖPÜK TABAK' },
  { suffix: 'cat-pos-3', name: 'KASE SIZDIRMAZ' },
  { suffix: 'cat-pos-4', name: 'AYPE TORBA' },
  { suffix: 'cat-elek', name: 'Elektronik' },
  { suffix: 'cat-ofis', name: 'Ofis Malzemeleri' },
];

const DEMO_PRODUCTS = [
  {
    code: 'HSR-01',
    name: 'HIŞIR P. ŞEFFAF MİNİ BOY (1KG/400 ADET)',
    cat: 'cat-pos-1',
    sp: 45,
    pp: 30,
    unit: 'KG',
    bar: '869100000001',
    stock: 150,
  },
  {
    code: 'HSR-02',
    name: 'HIŞIR P. ŞEFFAF KÜÇÜK BOY (1KG/220 ADET)',
    cat: 'cat-pos-1',
    sp: 45,
    pp: 30,
    unit: 'KG',
    bar: '869100000002',
    stock: 120,
  },
  {
    code: 'HSR-03',
    name: 'HIŞIR P. ŞEFFAF ORTA BOY (1KG/150 ADET)',
    cat: 'cat-pos-1',
    sp: 45,
    pp: 30,
    unit: 'KG',
    bar: '869100000003',
    stock: 133,
  },
  {
    code: 'ELK-001',
    name: 'Laptop Dell Inspiron 15',
    cat: 'cat-elek',
    sp: 16500,
    pp: 12000,
    unit: 'ADET',
    bar: '8691234567890',
    stock: 45,
  },
  {
    code: 'OFS-001',
    name: 'A4 Kağıt 500 Yaprak',
    cat: 'cat-ofis',
    sp: 75,
    pp: 45,
    unit: 'PAKET',
    bar: '8691234560001',
    stock: 350,
  },
];

const DEMO_CONTACTS = [
  { code: 'CRI-0001', name: 'ABC Teknoloji A.Ş.', type: 'CUSTOMER', balance: 12400 },
  { code: 'CRI-0002', name: 'XYZ Danışmanlık Ltd.', type: 'CUSTOMER', balance: 8500 },
  { code: 'CRI-0003', name: 'TechDistributor A.Ş.', type: 'BOTH', balance: 3200 },
];

/** İşletme tenant'ına POS/muhasebe için minimum demo stok + cari yükler */
export async function ensureBusinessDemoData(prisma: PrismaClient, tenantId: string) {
  const whId = `${tenantId}-wh-main`;

  await prisma.warehouse.upsert({
    where: { id: whId },
    update: { isDefault: true, isActive: true },
    create: {
      id: whId,
      tenantId,
      name: 'Ana Depo',
      code: 'WH-001',
      isDefault: true,
      isActive: true,
    },
  });

  for (const c of DEMO_CATEGORIES) {
    const id = `${tenantId}-${c.suffix}`;
    await prisma.productCategory.upsert({
      where: { id },
      update: { name: c.name, tenantId },
      create: { id, tenantId, name: c.name },
    });
  }

  for (const p of DEMO_PRODUCTS) {
    const categoryId = `${tenantId}-${p.cat}`;
    const product = await prisma.product.upsert({
      where: { tenantId_code: { tenantId, code: p.code } },
      update: {
        name: p.name,
        categoryId,
        salePrice: p.sp,
        purchasePrice: p.pp,
        isActive: true,
        barcode: p.bar,
        deletedAt: null,
      },
      create: {
        tenantId,
        code: p.code,
        name: p.name,
        categoryId,
        purchasePrice: p.pp,
        salePrice: p.sp,
        barcode: p.bar,
        vatRate: 20,
        unit: p.unit,
        type: 'PRODUCT',
        isService: false,
        isActive: true,
      },
    });

    await prisma.stockItem.upsert({
      where: {
        productId_warehouseId_tenantId: {
          productId: product.id,
          warehouseId: whId,
          tenantId,
        },
      },
      update: { quantity: p.stock },
      create: {
        tenantId,
        productId: product.id,
        warehouseId: whId,
        quantity: p.stock,
      },
    });
  }

  await prisma.contact.upsert({
    where: { tenantId_code: { tenantId, code: 'PERAKENDE' } },
    update: { isActive: true, name: 'Perakende Müşteri' },
    create: {
      tenantId,
      code: 'PERAKENDE',
      name: 'Perakende Müşteri',
      type: 'CUSTOMER',
      isActive: true,
    },
  });

  for (const c of DEMO_CONTACTS) {
    await prisma.contact.upsert({
      where: { tenantId_code: { tenantId, code: c.code } },
      update: { isActive: true, balance: c.balance, name: c.name },
      create: {
        tenantId,
        code: c.code,
        name: c.name,
        type: c.type as 'CUSTOMER' | 'SUPPLIER' | 'BOTH',
        balance: c.balance,
        isActive: true,
      },
    });
  }

  await prisma.cashAccount.upsert({
    where: { id: `${tenantId}-cash-main` },
    update: { isDefault: true, isActive: true },
    create: {
      id: `${tenantId}-cash-main`,
      tenantId,
      name: 'Ana Kasa',
      code: 'KSA-001',
      currency: 'TRY',
      balance: 10000,
      isDefault: true,
      isActive: true,
    },
  });

  const [products, contacts, categories] = await Promise.all([
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.contact.count({ where: { tenantId, isActive: true } }),
    prisma.productCategory.count({ where: { tenantId } }),
  ]);

  return { tenantId, products, contacts, categories };
}
