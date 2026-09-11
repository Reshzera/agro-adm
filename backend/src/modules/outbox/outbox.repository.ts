import { Injectable } from '@nestjs/common';
import { OutboxStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OutboxRepository {
  constructor(private readonly db: DatabaseService) {}

  find(id: string) {
    return this.db.client.outboxMessage.findUnique({ where: { id } });
  }

  findDue(now: Date, limit: number) {
    return this.db.client.outboxMessage.findMany({
      where: {
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
        availableAt: { lte: now },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
  }

  markProcessed(id: string, processedAt: Date) {
    return this.db.client.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxStatus.PROCESSED,
        attempts: { increment: 1 },
        lastError: null,
        processedAt,
      },
    });
  }

  markFailed(id: string, error: string, availableAt: Date) {
    return this.db.client.outboxMessage.updateMany({
      where: { id, status: { not: OutboxStatus.PROCESSED } },
      data: {
        status: OutboxStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error,
        availableAt,
      },
    });
  }
}
