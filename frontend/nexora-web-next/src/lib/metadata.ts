import type { Metadata } from "next";

export const SITE_NAME = "NEXORA";
export const SITE_DESCRIPTION =
  "NEXORA is a secure gaming command center for discovering games, tracking deals and giveaways, managing wishlists, and monitoring account safety.";

const DEVELOPMENT_URL = "http://localhost:3000";
const SOCIAL_IMAGE = "/brand/nexora-logo.png";

export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    return new URL(DEVELOPMENT_URL);
  }

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(DEVELOPMENT_URL);
  }
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  keywords: readonly string[];
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    keywords: [SITE_NAME, ...keywords],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1254,
          height: 1254,
          alt: "NEXORA gaming command center logo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}
