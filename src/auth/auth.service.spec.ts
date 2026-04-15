jest.mock('../../prisma/prisma.service', () => {
  return {
    PrismaService: class {
      user = {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      verificationToken = {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      };
      refreshToken = {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      };
      passwordResetToken = {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      };
    },
  };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: class {
    signAsync = jest.fn().mockResolvedValue('mock_jwt_token');
  },
}));

jest.mock('./email.service', () => ({
  EmailService: class {
    sendVerificationEmail = jest.fn().mockResolvedValue(undefined);
    sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
  },
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    getOrThrow: jest.fn().mockReturnValue('development'),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    hashedPassword: 'hashed_password',
    emailVerified: true,
    createdAt: new Date(),
  };

  let mockResponse: any;

  beforeEach(async () => {
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      verificationToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('token') },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('development') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    const signUpDto = { email: 'test@example.com', password: 'password123' };

    it('should create a new user and send verification email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'user-1', ...signUpDto });
      prismaMock.verificationToken.create.mockResolvedValue({
        token: 'verify-token',
      });

      const result = await service.signup(signUpDto);

      expect(result.message).toContain('registered successfully');
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.verificationToken.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.signup(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('signin', () => {
    const signInDto = { email: 'test@example.com', password: 'password123' };

    it('should sign in user and set cookies', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.signin(signInDto, mockResponse as any);

      expect(result.message).toBe('User signed in successfully');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for wrong credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.signin(signInDto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });

      await expect(
        service.signin(signInDto, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if password is wrong', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.signin(signInDto, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signout', () => {
    it('should clear cookies on signout', () => {
      const result = service.signout(mockResponse as any);

      expect(result.message).toBe('User signed out successfully');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        lookupHash: 'hash',
        bcryptHash: 'hashed_token',
        expiresAt: futureDate,
        user: mockUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.refreshToken.delete.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens(
        'valid-refresh-token',
        mockResponse as any,
      );

      expect(result.message).toBe('Tokens refreshed successfully');
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('invalid-token', mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        lookupHash: 'hash',
        bcryptHash: 'hashed_token',
        expiresAt: pastDate,
        user: mockUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.refreshTokens('expired-token', mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signoutAllDevices', () => {
    it('should sign out from all devices', async () => {
      prismaMock.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.signoutAllDevices(
        'user-1',
        mockResponse as any,
      );

      expect(result.message).toBe('Signed out from all devices successfully');
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'verify-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser, emailVerified: false },
      });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.verificationToken.delete.mockResolvedValue({});

      const result = await service.verifyEmail('verify-token');

      expect(result.message).toBe('Email verified successfully');
    });

    it('should throw BadRequestException for invalid token', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'verify-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 86400000),
        user: { ...mockUser, emailVerified: false },
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return message if email already verified', async () => {
      prismaMock.verificationToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'verify-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        user: { ...mockUser, emailVerified: true },
      });

      const result = await service.verifyEmail('verify-token');

      expect(result.message).toBe('Email is already verified');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      });
      prismaMock.verificationToken.deleteMany.mockResolvedValue({});
      prismaMock.verificationToken.create.mockResolvedValue({});

      const result = await service.resendVerificationEmail({
        email: 'test@example.com',
      });

      expect(result.message).toBe('Verification email sent successfully');
    });

    it('should throw BadRequestException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail({ email: 'notfound@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email already verified', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      await expect(
        service.resendVerificationEmail({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.deleteMany.mockResolvedValue({});
      prismaMock.passwordResetToken.create.mockResolvedValue({});

      const result = await service.requestPasswordReset({
        email: 'test@example.com',
      });

      expect(result.message).toBe('Password reset email sent successfully');
    });

    it('should throw BadRequestException if user not found (but not reveal user exists)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset({ email: 'notfound@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'reset-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        user: mockUser,
      });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.refreshToken.deleteMany.mockResolvedValue({});
      prismaMock.passwordResetToken.delete.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'reset-token',
        password: 'newpassword123',
      });

      expect(result.message).toBe('Password reset successfully');
    });

    it('should throw BadRequestException for invalid token', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          password: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'reset-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 3600000),
        user: mockUser,
      });

      await expect(
        service.resetPassword({
          token: 'expired-token',
          password: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
