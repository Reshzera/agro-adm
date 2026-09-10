import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chat } from '../../components/chat/chat/chat'

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chatId] = useState(() => searchParams.get('chat') ?? crypto.randomUUID())
  const hasStoredConversation = searchParams.has('chat')

  useEffect(() => {
    if (!hasStoredConversation) {
      setSearchParams({ chat: chatId }, { replace: true })
    }
  }, [chatId, hasStoredConversation, setSearchParams])

  return <Chat chatId={chatId} loadHistory={hasStoredConversation} />
}
