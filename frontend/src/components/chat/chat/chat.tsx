import { useQuery } from "@tanstack/react-query";
import { chatEndpoints } from "../../../service/chat";
import { Conversation } from "../conversation/conversation";
import styles from "./chat.module.scss";

type ChatProps = {
  chatId: string;
  loadHistory: boolean;
};

export function Chat({ chatId, loadHistory }: ChatProps) {
  const history = useQuery({
    queryKey: ["chats", chatId],
    queryFn: async ({ signal }) => {
      const { data } = await chatEndpoints.history(chatId, signal);
      return data;
    },
    enabled: loadHistory,
  });

  if (loadHistory && history.isPending) {
    return <p className={styles.loading}>Abrindo conversa…</p>;
  }

  if (history.isError) {
    return <p className={styles.error}>Não foi possível abrir esta conversa.</p>;
  }

  return <Conversation chatId={chatId} initialMessages={history.data ?? []} />;
}
