import { IsNotEmpty, IsString, IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    example: 'password123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class SignInDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
  })
  @IsNotEmpty()
  password: string;
}

export class ResendVerificationEmailDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123-reset-token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'newpassword123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 100, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'refresh-token-string',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
