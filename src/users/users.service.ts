import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      select: { email: true, createdAt: true },
      where: {
        id,
      },
    });

    return user;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true },
    });
    return users;
  }
}
