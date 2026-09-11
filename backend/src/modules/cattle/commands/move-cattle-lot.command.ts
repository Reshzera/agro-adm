import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullish();

/**
 * The transport-neutral payload for a cattle movement. Farm and actor context
 * are deliberately supplied by trusted application code, never by callers.
 */
export const moveCattleLotCommandSchema = z
  .object({
    lotId: z.string().trim().min(1).max(200),
    fromPaddockId: z.string().trim().min(1).max(200),
    toPaddockId: z.string().trim().min(1).max(200),
    occurredAt: z.iso.datetime({ offset: true }),
    reason: optionalText(500),
    notes: optionalText(2_000),
    idempotencyKey: z.string().trim().min(8).max(200),
    causationId: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export type MoveCattleLotCommand = z.infer<typeof moveCattleLotCommandSchema>;

// The agent input is derived here so it can never drift from the business
// command or gain a caller-controlled farmId. It is also what a preview needs:
// nothing is written, so there is no idempotency key to carry.
export const moveCattleLotAgentInputSchema = moveCattleLotCommandSchema.omit({
  idempotencyKey: true,
  causationId: true,
});

export type MoveCattleLotIntent = z.infer<typeof moveCattleLotAgentInputSchema>;

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  throw new BadRequestException({
    message: parsed.error.issues.map((issue) => issue.message),
    error: 'Invalid cattle movement command',
    statusCode: 400,
  });
}

export function parseMoveCattleLotCommand(
  input: unknown,
): MoveCattleLotCommand {
  return parse(moveCattleLotCommandSchema, input);
}

export function parseMoveCattleLotIntent(input: unknown): MoveCattleLotIntent {
  return parse(moveCattleLotAgentInputSchema, input);
}
