export type AuthSession = {
  session: { id: string; userId: string; expiresAt: string }
  user: { id: string; email: string; name?: string | null }
}

export type SignInWithEmailPayload = {
  email: string
  password: string
  rememberMe?: boolean
}

export type SignUpWithEmailPayload = {
  name: string
  email: string
  password: string
}
