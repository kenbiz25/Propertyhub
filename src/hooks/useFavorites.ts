
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export function useFavorites() {
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setFavIds(new Set());
      setReady(true);
      return;
    }
    const colRef = collection(db, "user_favorites", user.uid, "properties");
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
  }, [user?.uid]);

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
