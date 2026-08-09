import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/metadata";

const routes = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/deals", changeFrequency: "daily", priority: 0.9 },
  { path: "/giveaways", changeFrequency: "daily", priority: 0.9 },
  { path: "/wishlist", changeFrequency: "weekly", priority: 0.7 },
  { path: "/security", changeFrequency: "weekly", priority: 0.7 },
  { path: "/sentinel", changeFrequency: "monthly", priority: 0.6 },
  { path: "/settings", changeFrequency: "monthly", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return routes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
