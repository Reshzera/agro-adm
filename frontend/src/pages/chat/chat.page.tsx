import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useSearchParams } from 'react-router-dom'
import { chatEndpoints } from '../../service/chat'
import styles from './chat.page.module.scss'

function textOf(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function Conversation({ chatId, initialMessages }: { chatId: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState('')
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: chatEndpoints.streamUrl(),
      credentials: 'include',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: chatEndpoints.payload(id, messages[messages.length - 1]),
      }),
    }),
    [],
  )
  const { messages, sendMessage, status, error } = useChat({ id: chatId, messages: initialMessages, transport })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || status !== 'ready') return
    sendMessage({ text })
    setInput('')
  }

  return <>
    <section className={styles.messages} aria-live="polite">
      {messages.length === 0 && <div className={styles.welcome}>
        <p className={styles.eyebrow}>agro-adm</p>
        <h1>Bom dia. Vamos cuidar da fazenda?</h1>
        <p>Me pergunte sobre o que está acontecendo por aí.</p>
      </div>}
      {messages.map((message) => {
        const text = textOf(message)
        if (!text) return null
        return <article className={`${styles.message} ${message.role === 'user' ? styles.messageUser : ''}`} key={message.id}>
          <span>{message.role === 'user' ? 'Você' : 'Agro-adm'}</span>
          <p>{text}</p>
        </article>
      })}
    </section>
    <form className={styles.composer} onSubmit={submit}>
      <label className={styles.srOnly} htmlFor="question">Sua pergunta</label>
      <textarea id="question" rows={1} value={input} onChange={(event) => setInput(event.target.value)} placeholder="O que você quer saber?" disabled={status !== 'ready'} />
      <button type="submit" disabled={!input.trim() || status !== 'ready'}>
        {status === 'streaming' || status === 'submitted' ? 'Pensando…' : 'Enviar'}
      </button>
    </form>
    {error && <p className={styles.error}>Não foi possível responder agora. Tente novamente.</p>}
  </>
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chatId] = useState(() => searchParams.get('chat') ?? crypto.randomUUID())
  const hasStoredConversation = searchParams.has('chat')
  const [history, setHistory] = useState<UIMessage[] | null>(hasStoredConversation ? null : [])

  useEffect(() => {
    if (!hasStoredConversation) {
      setSearchParams({ chat: chatId }, { replace: true })
      return
    }
    const controller = new AbortController()
    chatEndpoints.history(chatId, controller.signal)
      .then(({ data }) => setHistory(data))
      .catch(() => { if (!controller.signal.aborted) setHistory([]) })
    return () => controller.abort()
  }, [chatId, hasStoredConversation, setSearchParams])

  return history === null
    ? <p className={styles.loading}>Abrindo conversa…</p>
    : <Conversation chatId={chatId} initialMessages={history} />
}
