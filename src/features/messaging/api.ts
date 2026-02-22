
// src/features/messages/api.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import type { Conversation, Message } from "./types";

type AppRole = "customer" | "agent" | "admin" | "superadmin";

async function getMyRole(): Promise<AppRole> {
  const cached = typeof window !== "undefined" ? localStorage.getItem("hh_role") : null;
  if (cached && ["customer", "agent", "admin", "superadmin"].includes(cached)) {
    return cached as AppRole;
  }

  const me = auth.currentUser?.uid;
  if (!me) return "customer";

  try {
    const snap = await getDoc(doc(db, "users", me));
    const role = (snap.data()?.role ?? "customer") as AppRole;
    try { localStorage.setItem("hh_role", role); } catch {}
    return role;
  } catch {
    return "customer";
  }
}

/** Find or create a conversation between current user and agent */
export async function startConversation(agent_id: string): Promise<string> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not authenticated");

  // Try to find existing conversation (user_id == me AND agent_id == agent_id)
  const qExisting = query(
    collection(db, "conversations"),
    where("user_id", "==", me),
    where("agent_id", "==", agent_id),
    limit(1)
  );
  const existingSnap = await getDocs(qExisting);
  if (!existingSnap.empty) {
    return existingSnap.docs[0].id;
  }

  // Create new conversation
  const ref = await addDoc(collection(db, "conversations"), {
    user_id: me,
    agent_id,
    created_at: serverTimestamp(),
  });

  return ref.id;
}

/** Fetch conversations for current user (user_id == me OR agent_id == me) */
export async function fetchConversationsForMe(): Promise<Conversation[]> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not authenticated");

  const role = await getMyRole();
  if (role === "admin" || role === "superadmin") {
    const qAll = query(collection(db, "conversations"), orderBy("created_at", "desc"));
    const snap = await getDocs(qAll);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Conversation[];
  }

  // Firestore doesn't have a simple `or()` helper in JS SDK, so we merge two queries
  const qAsUser = query(
    collection(db, "conversations"),
    where("user_id", "==", me),
    orderBy("created_at", "desc")
  );
  const qAsAgent = query(
    collection(db, "conversations"),
    where("agent_id", "==", me),
    orderBy("created_at", "desc")
  );

  const [snapUser, snapAgent] = await Promise.all([getDocs(qAsUser), getDocs(qAsAgent)]);

  // Merge and de‑duplicate by id
  const map = new Map<string, Conversation>();
  snapUser.forEach((doc) => map.set(doc.id, { id: doc.id, ...(doc.data() as any) }));
  snapAgent.forEach((doc) => map.set(doc.id, { id: doc.id, ...(doc.data() as any) }));

  // Return sorted by created_at desc
  const rows = Array.from(map.values()) as Conversation[];
  rows.sort((a, b) => {
    const ta = (a.created_at?.toMillis?.() ?? 0);
    const tb = (b.created_at?.toMillis?.() ?? 0);
    return tb - ta;
  });

  return rows;
}

export { getMyRole };

/** Fetch messages for a conversation ordered by created_at asc */
export async function fetchMessages(conversation_id: string): Promise<Message[]> {
  const q = query(
    collection(db, "messages"),
    where("conversation_id", "==", conversation_id),
    orderBy("created_at", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
}

/** Send a message into a conversation */
export async function sendMessage(conversation_id: string, body: string): Promise<void> {
  const me = auth.currentUser?.uid;
  if (!me) throw new Error("Not authenticated");
  if (!body.trim()) return;

  await addDoc(collection(db, "messages"), {
    conversation_id,
    sender_id: me,
    body,
    created_at: serverTimestamp(),
  });
}
