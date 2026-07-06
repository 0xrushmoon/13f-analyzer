import { APP_URL, SITE } from "./site";

export function SiteJsonLd() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: APP_URL,
    description: SITE.tagline,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/institutions?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: APP_URL,
    description: SITE.tagline,
    softwareVersion: SITE.version,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with API pay-per-use via MPP or Stripe",
    },
    featureList: [
      "SEC Form 13F-HR institutional holdings",
      "Quarter-over-quarter portfolio changes",
      "AI-powered holdings analysis",
      "Agent REST API with OpenAPI spec",
      "MPP machine payments for agents",
    ],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: APP_URL,
    sameAs: [SITE.github],
  };

  const graphs = [website, software, organization];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graphs) }}
    />
  );
}
