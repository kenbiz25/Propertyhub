import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteUrl = process.env.SITE_URL || "https://kenyaproperties.co.ke";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("Missing Firebase env vars. Set VITE_FIREBASE_* in your environment.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const today = new Date().toISOString().split("T")[0];

const staticEntries = [
  { path: "/",                    changefreq: "daily",   priority: "1.0" },
  { path: "/listings",            changefreq: "daily",   priority: "0.9" },
  { path: "/agents",              changefreq: "weekly",  priority: "0.8" },
  { path: "/list-property",       changefreq: "monthly", priority: "0.7" },
  { path: "/mortgage-calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/about",               changefreq: "monthly", priority: "0.6" },
  { path: "/support",             changefreq: "monthly", priority: "0.5" },
  { path: "/reviews",             changefreq: "weekly",  priority: "0.5" },
  { path: "/privacy",             changefreq: "yearly",  priority: "0.3" },
  { path: "/terms",               changefreq: "yearly",  priority: "0.3" },
];

const toUrl = (p) => `${siteUrl.replace(/\/$/, "")}${p}`;

const urlEntry = ({ loc, lastmod, changefreq, priority }) => {
  const lines = [`  <url>`, `    <loc>${loc}</loc>`];
  if (lastmod)   lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority)  lines.push(`    <priority>${priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
};

const fetchListings = async () => {
  const entries = [];
  try {
    const q = query(collection(db, "properties"), where("status", "==", "published"));
    const snap = await getDocs(q);
    snap.forEach((doc) => {
      const d = doc.data();
      const updatedAt = d?.updated_at?.toDate?.() ?? d?.created_at?.toDate?.() ?? null;
      entries.push({
        loc: toUrl(`/listing/${doc.id}`),
        lastmod: updatedAt ? updatedAt.toISOString().split("T")[0] : today,
        changefreq: "weekly",
        priority: "0.8",
      });
    });
  } catch {
    const q = query(collection(db, "properties"), where("published", "==", true));
    const snap = await getDocs(q);
    snap.forEach((doc) => {
      entries.push({ loc: toUrl(`/listing/${doc.id}`), lastmod: today, changefreq: "weekly", priority: "0.8" });
    });
  }
  return entries;
};

const fetchAgents = async () => {
  const entries = [];
  const q = query(collection(db, "users"), where("role", "==", "agent"));
  const snap = await getDocs(q);
  snap.forEach((doc) => {
    entries.push({ loc: toUrl(`/agents/${doc.id}`), lastmod: today, changefreq: "monthly", priority: "0.6" });
  });
  return entries;
};

const buildSitemap = async () => {
  const [listingEntries, agentEntries] = await Promise.all([fetchListings(), fetchAgents()]);

  const staticUrls = staticEntries.map((e) =>
    urlEntry({ loc: toUrl(e.path), lastmod: today, changefreq: e.changefreq, priority: e.priority })
  );
  const dynamicUrls = [...listingEntries, ...agentEntries].map(urlEntry);

  const allUrls = [...staticUrls, ...dynamicUrls].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls}\n</urlset>\n`;
};

const run = async () => {
  const sitemap = await buildSitemap();
  const outPath = path.resolve(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outPath, sitemap, "utf8");
  console.log(`Sitemap written to ${outPath} (${sitemap.split("<url>").length - 1} URLs)`);
};

run().catch((err) => {
  console.error("Failed to generate sitemap:", err);
  process.exit(1);
});
