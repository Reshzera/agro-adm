export const TEST_USER_HEADER = 'x-test-user-id';

export function credentialsFor(userId: string): Record<string, string> {
  return { [TEST_USER_HEADER]: userId };
}
