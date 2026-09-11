import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type DatabaseClient = Prisma.TransactionClient;

const ambientTransaction = new AsyncLocalStorage<DatabaseClient>();

@Injectable()
export class DatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  get client(): DatabaseClient {
    return ambientTransaction.getStore() ?? this.prisma;
  }

  transaction<T>(operation: () => Promise<T>): Promise<T> {
    const ambient = ambientTransaction.getStore();
    if (ambient) return operation();

    return this.prisma.$transaction((tx) =>
      ambientTransaction.run(tx, operation),
    );
  }
}
