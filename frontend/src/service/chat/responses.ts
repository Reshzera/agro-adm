import type { UIMessage } from 'ai'

export type ChatHistory = UIMessage[]

export type ChatSummary = {
  id: string
  title: string | null
  source: 'WEB' | 'WHATSAPP'
  updatedAt: string
}

export type CreatedChat = {
  id: string
  title: null
  messages: []
}
