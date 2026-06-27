import { Test, TestingModule } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  lead: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  contact: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  deal: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  activity: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('CrmService', () => {
  let service: CrmService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLeads', () => {
    it('should return leads for a tenant', async () => {
      const mockLeads = [{ id: '1', tenantId: 'tenant-1', name: 'John Doe' }];
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.getLeads('tenant-1');
      expect(result).toEqual(mockLeads);
      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateLeadStatus', () => {
    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      await expect(service.updateLeadStatus('tenant-1', 'lead-1', 'WON')).rejects.toThrow(NotFoundException);
    });

    it('should update status and create contact if WON and contact does not exist', async () => {
      const mockLead = { id: 'lead-1', tenantId: 'tenant-1', email: 'john@example.com', name: 'John Doe' };
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue({ ...mockLead, status: 'WON' });
      mockPrismaService.contact.findFirst.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue({ id: 'contact-1' });

      await service.updateLeadStatus('tenant-1', 'lead-1', 'WON');

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'WON' },
      });
      expect(prisma.contact.create).toHaveBeenCalled();
    });
  });

  describe('Deals', () => {
    it('should get deals', async () => {
      mockPrismaService.deal.findMany.mockResolvedValue([]);
      await service.getDeals('tenant-1');
      expect(prisma.deal.findMany).toHaveBeenCalled();
    });

    it('should create a deal', async () => {
      const data = { title: 'Test Deal', value: 5000, stage: 'PROSPECTING' };
      mockPrismaService.deal.create.mockResolvedValue(data);
      const res = await service.createDeal('tenant-1', data);
      expect(res).toEqual(data);
    });
  });
});
