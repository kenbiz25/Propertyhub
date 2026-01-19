
import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  startConversation,
  fetchConversationsForMe,
  fetchMessages,
  sendMessage,
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
  return useQuery<Conversation[]>({
    queryKey: MQ.conversations,
    queryFn: fetchConversationsForMe,
  });
}

/* =========================================================================
 * Messages for a conversation + realtime subscription
 * ========================================================================= */
export function useMessages(conversation_id?: string) {
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery<Message[]>({
    queryKey: conversation_id ? MQ.messages(conversation_id) : ["messages", "conversation", "missing"],
    queryFn: () => {
      if (!conversation_id) return Promise.reject("Missing conversation_id");
      return fetchMessages(conversation_id);
    },
    enabled: !!conversation_id,
  });

  // Realtime: listen to INSERT on messages for this conversation
  useEffect(() => {
    if (!conversation_id) return;

    // Clean up any previous subscription
    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel(`messages-${conversation_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation_id}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          // Optimistically append to cache
          qc.setQueryData<Message[]>(MQ.messages(conversation_id), (old = []) => [...old, newMsg]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => channel.unsubscribe();
  }, [conversation_id, qc]);

  return query;
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
