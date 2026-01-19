
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
const db = admin.firestore();

// Log an event on favorite add/remove
exports.onFavoriteWrite = functions.firestore
  .document("user_favorites/{uid}/properties/{propertyId}")
  .onWrite(async (change, ctx) => {
    const propertyId = ctx.params.propertyId;
    const now = admin.firestore.Timestamp.now();
    const op = change.after.exists ? +1 : -1;
    await db.collection("like_events").add({
      property_id: propertyId,
      created_at: now,
      op,
    });
  });

// Recompute last-48h counts periodically
exports.cronAggregateLikes48h = functions.pubsub
  .schedule("every 15 minutes")
  .timeZone("Africa/Nairobi")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - 48 * 3600 * 1000);

    const snap = await db.collection("like_events").where("created_at", ">=", cutoff).get();
    const tally = new Map<string, number>();
    snap.forEach(d => {
      const { property_id, op } = d.data() as { property_id: string; op: number };
      tally.set(property_id, (tally.get(property_id) || 0) + (op || 0));
    });

    const batch = db.batch();
    for (const [propertyId, count] of tally.entries()) {
      const ref = db.collection("property_like_agg").doc(propertyId);
      batch.set(ref, {
        property_id: propertyId,
        count_48h: Math.max(0, count),
        property_ref: db.doc(`properties/${propertyId}`),
        updated_at: now,
      }, { merge: true });
    }
    await batch.commit();
    return null;
  });
