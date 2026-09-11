import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { OutboxStatus } from '@prisma/client';
import type { DatabaseService } from '../../src/modules/database/database.service';
import { OutboxProcessor } from '../../src/modules/outbox/outbox.processor';
import type { OutboxRepository } from '../../src/modules/outbox/outbox.repository';
import type { RuleEngineService } from '../../src/modules/rule-engine/rule-engine.service';

describe('OutboxProcessor', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  function setup() {
    const message = {
      id: 'outbox-1',
      eventId: 'event-1',
      status: OutboxStatus.PENDING,
      attempts: 0,
    };
    const repository = {
      find: jest.fn(() => Promise.resolve({ ...message })),
      findDue: jest.fn(() => Promise.resolve([{ id: message.id }])),
      markProcessed: jest.fn(() => {
        message.status = OutboxStatus.PROCESSED;
        message.attempts += 1;
        return Promise.resolve({ ...message });
      }),
      markFailed: jest.fn(() => {
        message.status = OutboxStatus.FAILED;
        message.attempts += 1;
        return Promise.resolve({ count: 1 });
      }),
    };
    repository.find.mockImplementation(() => Promise.resolve({ ...message }));
    const rules = { handle: jest.fn(() => Promise.resolve(true)) };
    const database = {
      transaction: jest.fn(<T>(operation: () => Promise<T>) => operation()),
    };
    const processor = new OutboxProcessor(
      repository as unknown as OutboxRepository,
      rules as unknown as RuleEngineService,
      database as unknown as DatabaseService,
    );
    return { processor, repository, rules, message };
  }

  it('processes a message once when the same delivery is received twice', async () => {
    const { processor, repository, rules } = setup();
    const now = new Date('2026-03-16T12:00:00.000Z');

    await processor.process('outbox-1', now);
    await processor.process('outbox-1', now);

    expect(rules.handle).toHaveBeenCalledTimes(1);
    expect(repository.markProcessed).toHaveBeenCalledTimes(1);
  });

  it('records a failed attempt and schedules a retry', async () => {
    const { processor, repository, rules } = setup();
    rules.handle.mockRejectedValueOnce(new Error('rule database unavailable'));
    const now = new Date('2026-03-16T12:00:00.000Z');

    await processor.process('outbox-1', now);

    expect(repository.markFailed).toHaveBeenCalledWith(
      'outbox-1',
      'rule database unavailable',
      new Date('2026-03-16T12:00:01.000Z'),
    );
  });

  it('sweeps due pending and failed messages', async () => {
    const { processor, repository, rules } = setup();
    const now = new Date('2026-03-16T12:00:00.000Z');

    await processor.sweep(now);

    expect(repository.findDue).toHaveBeenCalledWith(now, 50);
    expect(rules.handle).toHaveBeenCalledWith('event-1', now);
  });
});
