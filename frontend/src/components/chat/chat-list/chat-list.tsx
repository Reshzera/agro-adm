import { useState, type CSSProperties, type FormEvent } from "react";
import type { ChatSummary } from "../../../service/chat/responses";
import styles from "./chat-list.module.scss";

type ChatListProps = {
  chats: ChatSummary[];
  activeChatId: string | null;
  busy: boolean;
  onCreate(): void;
  onOpen(chatId: string): void;
  onRename(chatId: string, title: string): void;
  onArchive(chatId: string): void;
};

const activityFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

export function ChatList({
  chats,
  activeChatId,
  busy,
  onCreate,
  onOpen,
  onRename,
  onArchive,
}: ChatListProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  function startRenaming(chat: ChatSummary) {
    setRenamingId(chat.id);
    setDraftTitle(chat.title ?? "Nova conversa");
  }

  function submitRename(event: FormEvent, chatId: string) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (title) onRename(chatId, title);
    setRenamingId(null);
  }

  return (
    <aside className={styles.panel} aria-label="Conversas">
      <div className={styles.heading}>
        <div>
          <span>arquivo vivo</span>
          <h1>Conversas</h1>
        </div>
        <button
          className={styles.newButton}
          type="button"
          onClick={onCreate}
          disabled={busy}
          aria-label="Nova conversa"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className={styles.rule} aria-hidden="true" />
      <nav className={styles.list}>
        {chats.length === 0 && (
          <div className={styles.empty}>
            <p>Seu caderno ainda está em branco.</p>
            <button type="button" onClick={onCreate} disabled={busy}>
              Abrir a primeira página
            </button>
          </div>
        )}
        {chats.map((chat, index) => (
          <div
            className={`${styles.item} ${chat.id === activeChatId ? styles.active : ""}`}
            style={{ "--item-index": index } as CSSProperties}
            key={chat.id}
          >
            {renamingId === chat.id ? (
              <form
                className={styles.rename}
                onSubmit={(event) => submitRename(event, chat.id)}
              >
                <input
                  autoFocus
                  maxLength={80}
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  aria-label="Título da conversa"
                />
                <button type="submit">salvar</button>
              </form>
            ) : (
              <>
                <button
                  className={styles.openButton}
                  type="button"
                  onClick={() => onOpen(chat.id)}
                >
                  <span className={styles.title}>
                    {chat.title ?? "Nova conversa"}
                  </span>
                  <span className={styles.meta}>
                    {chat.source === "WHATSAPP" ? "WhatsApp" : "Web"} ·{" "}
                    {activityFormatter.format(new Date(chat.updatedAt))}
                  </span>
                </button>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => startRenaming(chat)}
                    aria-label={`Renomear ${chat.title ?? "conversa"}`}
                  >
                    editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onArchive(chat.id)}
                    aria-label={`Arquivar ${chat.title ?? "conversa"}`}
                  >
                    arquivar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
