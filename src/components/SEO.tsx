import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "Kenya Properties";
const BASE_URL = "https://kenyaproperties.co.ke";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const DEFAULT_DESCRIPTION =
  "Discover verified houses for sale & rent in Nairobi, apartments in Westlands/Kilimani, land & plots in Kiambu, Machakos, Ruiru. Free listings for agents & developers – Kenya's trusted real estate marketplace.";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8787623516632800";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /** JSON-LD structured data object(s) */
  schema?: object | object[];
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  imageAlt = `${title} | Kenya Properties`,
  type = "website",
  noindex = false,
  schema,
}: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  const schemas = schema
    ? Array.isArray(schema)
      ? schema
      : [schema]
    : [];

  // Inject AdSense via direct DOM append — avoids react-helmet adding data-rh
  // which AdSense rejects. Only runs on indexed content pages.
  useEffect(() => {
    if (noindex) return;
    if (document.querySelector(`script[src*="adsbygoogle"]`)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, [noindex]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_KE" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@Kenbiz25" />

      {/* Structured data */}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
