import { Test, TestingModule } from '@nestjs/testing';
import { B2cService } from './b2c.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  tenantIntegration: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('B2cService', () => {
  let service: B2cService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        B2cService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<B2cService>(B2cService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getB2cIntegrations', () => {
    it('should return a list of integrations for the given tenant', async () => {
      const mockIntegrations = [
        { id: '1', tenantId: 'tenant-1', type: 'B2C_ECOMMERCE', provider: 'SHOPIFY' },
      ];
      mockPrismaService.tenantIntegration.findMany.mockResolvedValue(mockIntegrations);

      const result = await service.getB2cIntegrations('tenant-1');
      
      expect(prisma.tenantIntegration.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', type: 'B2C_ECOMMERCE' },
      });
      expect(result).toEqual(mockIntegrations);
    });
  });

  describe('setupIntegration', () => {
    it('should upsert an integration configuration', async () => {
      const mockConfig = { apiKey: '12345' };
      const mockResult = {
        id: '2',
        tenantId: 'tenant-1',
        type: 'B2C_ECOMMERCE',
        provider: 'TRENTYOL',
        config: mockConfig,
      };
      
      mockPrismaService.tenantIntegration.upsert.mockResolvedValue(mockResult);

      const result = await service.setupIntegration('tenant-1', 'TRENTYOL', mockConfig);

      expect(prisma.tenantIntegration.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_type_provider: {
            tenantId: 'tenant-1',
            type: 'B2C_ECOMMERCE',
            provider: 'TRENTYOL',
          },
        },
        update: { config: mockConfig },
        create: {
          tenantId: 'tenant-1',
          type: 'B2C_ECOMMERCE',
          provider: 'TRENTYOL',
          config: mockConfig,
        },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook and return received status', async () => {
      const result = await service.handleWebhook('SHOPIFY', { order_id: 123 });
      expect(result).toEqual({ status: 'received' });
    });
  });
});
