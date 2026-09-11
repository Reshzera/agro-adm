import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OutboxStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { RuleEngineService } from '../rule-engine/rule-engine.service';
import { OutboxRepository } from './outbox.repository';

const SWEEP_INTERVAL_MS = 30_000;
const BATCH_SIZE = 50;
const MAX_RETRY_DELAY_MS = 15 * 60_000;

@Injectable()
export class OutboxProcessor
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly active = new Set<string>();
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly rules: RuleEngineService,
    private readonly db: DatabaseService,
  ) {}

  onApplicationBootstrap(): void {
    // The first sweep recovers messages committed before this process started.
    void this.sweep();
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onApplicationShutdown(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** Called only after the transaction which created the outbox row commits. */
  dispatch(id: string): void {
    void this.process(id);
  }

  async sweep(now = new Date()): Promise<void> {
    try {
      const messages = await this.repository.findDue(now, BATCH_SIZE);
      await Promise.all(messages.map(({ id }) => this.process(id, now)));
    } catch (error) {
      this.logger.error('Outbox sweep failed', this.errorMessage(error));
    }
  }

  async process(id: string, attemptedAt = new Date()): Promise<void> {
    if (this.active.has(id)) return;
    this.active.add(id);
    try {
      await this.db.transaction(async () => {
        const message = await this.repository.find(id);
        if (!message || message.status === OutboxStatus.PROCESSED) return;
        const handled = await this.rules.handle(message.eventId, attemptedAt);
        if (!handled) {
          throw new Error(`No handler registered for event ${message.eventId}`);
        }
        await this.repository.markProcessed(id, attemptedAt);
      });
    } catch (error) {
      const message = this.errorMessage(error);
      try {
        const current = await this.repository.find(id);
        const attempts = (current?.attempts ?? 0) + 1;
        const retryAt = new Date(
          attemptedAt.getTime() +
            Math.min(
              2 ** Math.max(0, attempts - 1) * 1_000,
              MAX_RETRY_DELAY_MS,
            ),
        );
        await this.repository.markFailed(id, message, retryAt);
      } catch (recordingError) {
        this.logger.error(
          `Could not record outbox failure for ${id}`,
          this.errorMessage(recordingError),
        );
      }
      this.logger.error(`Outbox message ${id} failed`, message);
    } finally {
      this.active.delete(id);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
