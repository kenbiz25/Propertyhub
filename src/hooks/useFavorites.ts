
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export function useFavorites() {
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  // Use onAuthStateChanged so favorites load correctly even when
  // Firebase auth is still initializing on the first render.
  const [uid, setUid] = useState<string | null>(() => auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) {
      setFavIds(new Set());
      setReady(true);
      return;
    }
    const colRef = collection(db, "user_favorites", uid, "properties");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const next = new Set<string>();
        snap.forEach((d) => next.add(d.id));
        setFavIds(next);
        setReady(true);
      },
      () => setReady(true)
    );
    return () => unsub();
  }, [uid]);

  const isFavorite = useCallback((propertyId: string) => favIds.has(propertyId), [favIds]);

  const toggleFavorite = useCallback(
    async (propertyId: string) => {
      const u = auth.currentUser;
      if (!u) throw new Error("AUTH_REQUIRED");
      const fRef = doc(db, "user_favorites", u.uid, "properties", propertyId);
      if (favIds.has(propertyId)) {
        await deleteDoc(fRef);
      } else {
        await setDoc(fRef, {
          created_at: serverTimestamp(),
          property_ref: doc(db, "properties", propertyId),
        });
      }
    },
    [favIds]
  );

  return { ready, favIds, isFavorite, toggleFavorite };
}
