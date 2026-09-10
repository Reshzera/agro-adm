export type AuthSession = {
  session: { id: string; userId: string; expiresAt: string }
  user: { id: string; email: string; name?: string | null }
}
