import { useMemo, useState, type FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import {
  DefaultChatTransport,
  isStaticToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import { ToolRenderer } from '../../generative-ui/tool-renderer'
import { chatEndpoints } from '../../../service/chat'
import { farmEndpoints } from '../../../service/farm'
import styles from './conversation.module.scss'

type ConversationProps = {
  chatId: string
  initialMessages: UIMessage[]
  onActivity?: () => void
}

export function Conversation({ chatId, initialMessages, onActivity }: ConversationProps) {
  const [input, setInput] = useState('')
  const farm = useQuery({
    queryKey: ['farm'],
    queryFn: async ({ signal }) => (await farmEndpoints.current(signal)).data,
  })
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
  const { messages, sendMessage, status, error, addToolApprovalResponse, addToolOutput } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: onActivity,
    sendAutomaticallyWhen: (options) =>
      lastAssistantMessageIsCompleteWithApprovalResponses(options) ||
      lastAssistantMessageIsCompleteWithToolCalls(options),
  })

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
        {farm.data && !farm.data.onboardingCompleted ? <>
          <h1>Vamos conhecer<br />sua fazenda?</h1>
          <p>Para começar, como ela se chama?</p>
        </> : <>
          <h1>Bom dia. Vamos cuidar da fazenda?</h1>
          <p>Me pergunte sobre o que está acontecendo por aí.</p>
        </>}
      </div>}
      {messages.map((message) => <article className={`${styles.message} ${message.role === 'user' ? styles.messageUser : ''}`} key={message.id}>
        <span>{message.role === 'user' ? 'Você' : 'Agro-adm'}</span>
        {message.parts.map((part, index) => {
          if (part.type === 'text') return <p key={index}>{part.text}</p>
          if (!isStaticToolUIPart(part)) return null
          return <ToolRenderer
            key={part.toolCallId}
            part={part}
            actions={{
              approve: (id, approved) => addToolApprovalResponse({ id, approved }),
              submitToolOutput: (toolCallId, output) => addToolOutput({ tool: 'showManualForm', toolCallId, output }),
            }}
          />
        })}
      </article>)}
    </section>
    <form className={styles.composer} onSubmit={submit}>
      <label className={styles.srOnly} htmlFor="question">Sua pergunta</label>
      <textarea id="question" rows={1} value={input} onChange={(event) => setInput(event.target.value)} placeholder={farm.data && !farm.data.onboardingCompleted ? 'Conte um pouco sobre sua fazenda…' : 'O que você quer saber?'} disabled={status !== 'ready'} />
      <button type="submit" disabled={!input.trim() || status !== 'ready'}>
        {status === 'streaming' || status === 'submitted' ? 'Pensando…' : 'Enviar'}
      </button>
    </form>
    {error && <p className={styles.error}>Não foi possível responder agora. Tente novamente.</p>}
  </>
}
