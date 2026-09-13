import { useCallback, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Chat } from '../../components/chat/chat/chat'
import { ChatList } from '../../components/chat/chat-list/chat-list'
import { WorkspacePanel } from '../../components/workspace/workspace-panel/workspace-panel'
import { chatEndpoints } from '../../service/chat'
import { useWorkspace, workspaceStore } from '../../workspace/workspace.store'
import { applyViewToSearchParams, viewFromSearchParams } from '../../workspace/workspace.url'
import styles from './chat.page.module.scss'

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const requestedFirstChat = useRef(false)
  const activeChatId = searchParams.get('chat')
  const workspace = useWorkspace()

  const openChat = useCallback(
    (chatId: string | null, replace = false) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (chatId) next.set('chat', chatId)
        else next.delete('chat')
        return next
      }, { replace }),
    [setSearchParams],
  )

  const chats = useQuery({
    queryKey: ['chats'],
    queryFn: async ({ signal }) => (await chatEndpoints.list(signal)).data,
  })

  const createChat = useMutation({
    mutationFn: async () => (await chatEndpoints.create()).data,
    onSuccess: async (chat) => {
      await queryClient.invalidateQueries({ queryKey: ['chats'] })
      openChat(chat.id)
    },
  })

  const renameChat = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatEndpoints.rename(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chats'] }),
  })

  const archiveChat = useMutation({
    mutationFn: (id: string) => chatEndpoints.archive(id),
    onSuccess: async (_, archivedId) => {
      const next = chats.data?.find((chat) => chat.id !== archivedId)
      if (activeChatId === archivedId) openChat(next?.id ?? null, true)
      await queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  useEffect(() => {
    if (!chats.data || chats.data.some((chat) => chat.id === activeChatId)) return
    openChat(chats.data.length ? chats.data[0].id : null, true)
  }, [activeChatId, chats.data, openChat])

  useEffect(() => {
    workspaceStore.dispatch({ type: 'restore', view: viewFromSearchParams(new URLSearchParams(window.location.search)) })
  }, [])

  useEffect(() => {
    const view = workspaceStore.getState().current
    if (applyViewToSearchParams(searchParams, view).toString() === searchParams.toString()) return
    setSearchParams((current) => applyViewToSearchParams(current, view), { replace: true })
  }, [workspace.current, searchParams, setSearchParams])

  useEffect(() => {
    if (chats.data?.length !== 0 || activeChatId || requestedFirstChat.current) return
    requestedFirstChat.current = true
    createChat.mutate()
  }, [activeChatId, chats.data, createChat])

  function archive(id: string) {
    const chat = chats.data?.find((item) => item.id === id)
    if (window.confirm(`Arquivar “${chat?.title ?? 'Nova conversa'}”?`)) archiveChat.mutate(id)
  }

  const busy = createChat.isPending || renameChat.isPending || archiveChat.isPending

  if (chats.isPending) return <p className={styles.status}>Abrindo o caderno…</p>
  if (chats.isError) return <p className={styles.error}>Não foi possível carregar suas conversas.</p>

  return <div className={styles.workspace}>
    <ChatList
      chats={chats.data}
      activeChatId={activeChatId}
      busy={busy}
      onCreate={() => createChat.mutate()}
      onOpen={(id) => openChat(id)}
      onRename={(id, title) => renameChat.mutate({ id, title })}
      onArchive={archive}
    />
    <section className={styles.conversation}>
      {activeChatId ? <Chat
        key={activeChatId}
        chatId={activeChatId}
        loadHistory
        onActivity={() => queryClient.invalidateQueries({ queryKey: ['chats'] })}
      /> : <div className={styles.blank}>
        <span>01</span>
        <h2>Uma página nova<br />começa por aqui.</h2>
        <button type="button" onClick={() => createChat.mutate()} disabled={createChat.isPending}>Nova conversa</button>
      </div>}
    </section>
    <WorkspacePanel />
  </div>
}
