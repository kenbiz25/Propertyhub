
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { collection, onSnapshot, orderBy, query as fsQuery, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import {
  startConversation,
  fetchConversationsForMe,
  fetchMessages,
  sendMessage,
  getMyRole,
} from "./api";
import type { Conversation, Message } from "./types";

/* =========================================================================
 * Query keys
 * ========================================================================= */
export const MQ = {
  conversations: ["messages", "conversations"] as const,
  messages: (conversation_id: string) =>
    ["messages", "conversation", conversation_id] as const,
};

/* =========================================================================
 * Conversations list (for current user/agent)
 * ========================================================================= */
export function useConversations() {
  const qc = useQueryClient();
  const meId = auth.currentUser?.uid;

  const queryState = useQuery<Conversation[]>({
    queryKey: MQ.conversations,
    queryFn: fetchConversationsForMe,
  });

  useEffect(() => {
    if (!meId) return;

    let unsubscribe: (() => void) | null = null;
    let alive = true;

    (async () => {
      const role = await getMyRole();
      if (!alive) return;

      if (role === "admin" || role === "superadmin") {
        const qAll = fsQuery(collection(db, "conversations"), orderBy("created_at", "desc"));
        unsubscribe = onSnapshot(qAll, (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
          qc.setQueryData(MQ.conversations, rows);
        });
        return;
      }

      let userRows: Conversation[] = [];
      let agentRows: Conversation[] = [];

      const update = () => {
        const map = new Map<string, Conversation>();
        userRows.forEach((r) => map.set(r.id, r));
        agentRows.forEach((r) => map.set(r.id, r));
        const rows = Array.from(map.values());
        rows.sort((a, b) => {
          const ta = (a.created_at?.toMillis?.() ?? 0);
          const tb = (b.created_at?.toMillis?.() ?? 0);
          return tb - ta;
        });
        qc.setQueryData(MQ.conversations, rows);
      };

      const qAsUser = fsQuery(
        collection(db, "conversations"),
        where("user_id", "==", meId),
        orderBy("created_at", "desc")
      );
      const qAsAgent = fsQuery(
        collection(db, "conversations"),
        where("agent_id", "==", meId),
        orderBy("created_at", "desc")
      );

      const unsubUser = onSnapshot(qAsUser, (snap) => {
        userRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
        update();
      });
      const unsubAgent = onSnapshot(qAsAgent, (snap) => {
        agentRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
        update();
      });

      unsubscribe = () => {
        unsubUser();
        unsubAgent();
      };
    })();

    return () => {
      alive = false;
      if (unsubscribe) unsubscribe();
    };
  }, [qc, meId]);

  return queryState;
}

/* =========================================================================
 * Messages for a conversation + realtime subscription
 * ========================================================================= */
export function useMessages(conversation_id?: string) {
  const qc = useQueryClient();

  const queryState = useQuery<Message[]>({
    queryKey: conversation_id ? MQ.messages(conversation_id) : ["messages", "conversation", "missing"],
    queryFn: () => {
      if (!conversation_id) return Promise.reject("Missing conversation_id");
      return fetchMessages(conversation_id);
    },
    enabled: !!conversation_id,
  });

  // Realtime: Firestore snapshot for this conversation
  useEffect(() => {
    if (!conversation_id) return;

    const q = fsQuery(
      collection(db, "messages"),
      where("conversation_id", "==", conversation_id),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
      qc.setQueryData(MQ.messages(conversation_id), rows);
    });

    return () => unsubscribe();
  }, [conversation_id, qc]);

  return queryState;
}

/* =========================================================================
 * Start conversation mutation (returns conversation id)
 * ========================================================================= */
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agent_id: string) => startConversation(agent_id),
    onSuccess: async () => {
      toast.success("Conversation started");
      await qc.invalidateQueries({ queryKey: MQ.conversations });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to start conversation"),
  });
}

/* =========================================================================
 * Send message mutation
 * ========================================================================= */
export function useSendMessage(conversation_id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!conversation_id) throw new Error("Missing conversation_id");
      await sendMessage(conversation_id, body);
    },
    onSuccess: async () => {
      // We rely on realtime to append the message; still invalidate for safety
      if (conversation_id) {
        await qc.invalidateQueries({ queryKey: MQ.messages(conversation_id) });
      }
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to send message"),
  });
}

/* =========================================================================
 * Optional: delete conversation (admin-only or unimplemented)
 * ========================================================================= */
// export function useDeleteConversation() { ... }
