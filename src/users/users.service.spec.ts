jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class {
    user = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    };
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });

      const result = await service.getUser('user-1');

      expect(result).toEqual({
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        select: { email: true, createdAt: true },
        where: { id: 'user-1' },
      });
    });

    it('should return null if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.getUser('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ]);

      const result = await service.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true },
      });
    });

    it('should return empty array if no users', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
    });
  });
});
