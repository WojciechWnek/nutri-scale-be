import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  SignUpDto,
  SignInDto,
  ResendVerificationEmailDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { EmailService } from './email.service';
import type { Response } from 'express';
import { randomUUID, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private isProd = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.isProd =
      this.configService.getOrThrow<string>('NODE_ENV') === 'production';
  }

  async signup(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });

    const token = await this.createVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(email, token);

    return {
      message:
        'User registered successfully. Please check your email to verify your account.',
    };
  }

  async signin(signInDto: SignInDto, res: Response) {
    const { email, password } = signInDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new BadRequestException('Wrong credentials');
    }

    const isMatch = await this.comparePasswords(
      password,
      existingUser.hashedPassword,
    );

    if (!isMatch) {
      throw new BadRequestException('Wrong credentials');
    }

    if (!existingUser.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in',
      );
    }

    const accessToken = await this.signAccessToken(
      existingUser.id,
      existingUser.email,
    );
    const refreshToken = await this.createRefreshToken(existingUser.id);

    if (!accessToken) {
      throw new ForbiddenException();
    }

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'User signed in successfully',
    };
  }

  signout(res: Response, refreshToken?: string) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    if (refreshToken) {
      this.revokeRefreshToken(refreshToken);
    }

    return {
      message: 'User signed out successfully',
    };
  }

  async refreshTokens(refreshToken: string, res: Response) {
    const lookupHash = this.generateLookupHash(refreshToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { lookupHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the token using bcrypt
    const isValid = await bcrypt.compare(refreshToken, tokenRecord.bcryptHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Rotate: Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Issue new tokens
    const newAccessToken = await this.signAccessToken(
      tokenRecord.user.id,
      tokenRecord.user.email,
    );
    const newRefreshToken = await this.createRefreshToken(tokenRecord.user.id);

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Tokens refreshed successfully',
    };
  }

  async signoutAllDevices(userId: string, res: Response) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      message: 'Signed out from all devices successfully',
    };
  }

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    if (verificationToken.user.emailVerified) {
      return {
        message: 'Email is already verified',
      };
    }

    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    await this.prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerificationEmail(dto: ResendVerificationEmailDto) {
    const { email } = dto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.prisma.verificationToken.deleteMany({
      where: { userId: user.id },
    });

    const token = await this.createVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(email, token);

    return {
      message: 'Verification email sent successfully',
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const { email } = dto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('If email exists, we sent reset link.');
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const token = await this.createPasswordResetToken(user.id);
    await this.emailService.sendPasswordResetEmail(email, token);

    return {
      message: 'Password reset email sent successfully',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await this.hashPassword(password);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { hashedPassword },
    });

    // Revoke all refresh tokens - user must re-login on all devices
    await this.prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    await this.prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return {
      message: 'Password reset successfully',
    };
  }

  private async createPasswordResetToken(userId: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  private async createVerificationToken(userId: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.verificationToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }

  private async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  }

  private async signAccessToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'access',
    };
    return this.jwtService.signAsync(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomUUID();
    const lookupHash = this.generateLookupHash(token);
    const bcryptHash = await this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        lookupHash,
        bcryptHash,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  private generateLookupHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashToken(token: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(token, saltRounds);
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    const lookupHash = this.generateLookupHash(token);
    await this.prisma.refreshToken.deleteMany({
      where: { lookupHash },
    });
  }
}
