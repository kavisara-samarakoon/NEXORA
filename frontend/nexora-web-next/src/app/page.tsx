import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import AuthStatus from "@/components/AuthStatus";
import HomepageFeedRetry from "@/components/HomepageFeedRetry";
import type { GameDeal } from "@/data/deals";
import {
  getDashboardSummary,
  getDeals,
  getGiveaways,
  type DashboardSummaryResult,
  type DealsResult,
  type GiveawaysResult,
} from "@/lib/api";
import { createPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Every Game. Every Deal. One Place.",
  description: "Discover game deals, explore giveaways, and keep your next great game on your wishlist with NEXORA.",
  path: "/",
  keywords: ["game deals", "game giveaways", "gaming wishlist", "game discovery"],
});

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

function DealLink({ deal, className, children }: { deal?: GameDeal; className?: string; children: ReactNode }) {
  // Match the existing Deals page's provider-link policy.
  let providerUrl: string | null = null;
  try {
    const url = new URL(deal?.dealUrl ?? "");
    if (url.protocol === "https:" && url.hostname === "www.cheapshark.com" &&
      !url.port && !url.username && !url.password && url.pathname === "/redirect" &&
      url.searchParams.get("dealID")?.trim()) {
      providerUrl = url.href;
    }
  } catch { /* Curated deals can have no provider link. */ }

  return providerUrl ? (
    <a href={providerUrl} className={className} target="_blank" rel="noopener noreferrer" aria-label={`View ${deal?.title} deal (opens in a new tab)`}>{children}</a>
  ) : (
    <Link href="/deals" className={className} aria-label={deal ? `View deals including ${deal.title}` : "Explore the Deals page"}>{children}</Link>
  );
}

// The current API contracts have no image fields. This is decorative brand art,
// never a substitute presented as a game's official cover.
function BrandArtwork({ compact = false, tone = 0 }: { compact?: boolean; tone?: number }) {
  return (
    <div className={`${styles.artwork} ${compact ? styles.compactArt : ""}`} data-tone={tone % 3} aria-hidden="true">
      <span className={styles.artLabel}>NEXORA COLLECTION</span>
      <span className={styles.orbit} />
      <span className={styles.monogram}>N</span>
      <span className={styles.artCaption}>FIND YOUR NEXT WORLD</span>
      <span className={styles.artCross}>+</span>
    </div>
  );
}

function HomeNavigation() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="NEXORA home">
        <span className={styles.brandMark}>
          <Image src="/brand/nexora-logo.png" width={90} height={90} alt="" priority />
        </span>
        <span>NEXORA<span className={styles.brandDot}>.</span></span>
      </Link>
      <nav className={styles.navigation} aria-label="Primary navigation">
        <Link href="/deals">Deals</Link>
        <Link href="/giveaways">Giveaways</Link>
        <Link href="/wishlist">Wishlist</Link>
        <Link href="/sentinel">Sentinel</Link>
        <span className={styles.futureLink} aria-label="News, coming soon">News <small>Soon</small></span>
      </nav>
      <div className={styles.account}>
        <Link href="/deals" className={styles.search} aria-label="Search games on the Deals page">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" />
          </svg>
        </Link>
        <AuthStatus />
      </div>
    </header>
  );
}

type HomeData = {
  deals: DealsResult;
  giveaways: GiveawaysResult;
  summary: DashboardSummaryResult;
};

function HomePresentation({ data }: { data?: HomeData }) {
  const loading = !data;
  const dealsFromApi = data?.deals.source === "api";
  const giveawaysFromApi = data?.giveaways.source === "api";
  // Shared helpers also serve inner-page demos; never render their sample fallbacks here.
  const deals = dealsFromApi ? data.deals.deals : [];
  const giveaways = giveawaysFromApi ? data.giveaways.giveaways : [];
  const featured = deals[0];
  const summary = data?.summary.source === "api" ? data.summary.dashboardSummary : null;
  const stores = Array.from(new Set([
    ...(dealsFromApi ? deals.map((deal) => deal.store) : []),
    ...(giveawaysFromApi ? giveaways.map((giveaway) => giveaway.platformLabel) : []),
  ]));
  const dealCount = summary?.activeDealsCount ?? (dealsFromApi ? deals.length : null);
  const giveawayCount = summary?.activeGiveawaysCount ?? (giveawaysFromApi ? giveaways.length : null);
  const storeCount = dealsFromApi || giveawaysFromApi ? stores.length : null;

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> GAME DEALS INTELLIGENCE</p>
          <h1 id="home-title">Every Game.<br />Every Deal.<br /><em>One Place.</em></h1>
          <p className={styles.intro}>Your next great game, at a better price. Discover deals and giveaways across major stores, and keep an eye on the games in your wishlist.</p>
          <div className={styles.heroActions}>
            <Link href="/deals" className={styles.primaryButton}>Explore Deals <Arrow /></Link>
            <Link href="/giveaways" className={styles.secondaryButton}>View Giveaways <Arrow /></Link>
          </div>
          <div className={styles.heroFootnote}><span aria-hidden="true">✳</span> Less searching. More playing.</div>
        </div>

        <article className={styles.featured} aria-labelledby="featured-title" aria-busy={loading}>
          <div className={styles.featuredTop}>
            <span><span className={styles.smallDot} /> {loading ? "DEALS LOADING" : featured ? "FEATURED DEAL" : dealsFromApi ? "NO FEATURED DEAL" : "DEALS UNAVAILABLE"}</span>
            {featured && <span className={styles.edition}>N° 01</span>}
          </div>
          <BrandArtwork />
          <div className={styles.featuredDetails}>
            <div className={styles.featuredMeta}>
              <span>{featured ? `${featured.store} / ${featured.category}` : "A new world is waiting"}</span>
              {featured && <span className={styles.discount}>{featured.discount}</span>}
            </div>
            <h2 id="featured-title">{featured?.title ?? (loading ? "Deals loading." : dealsFromApi ? "Your next discovery starts here." : "Featured deal unavailable.")}</h2>
            <div className={styles.featuredBottom}>
              {featured ? (
                <p className={styles.featuredPrice}>
                  <span className="sr-only">Current price: </span><strong>{featured.priceNew}</strong>
                  {featured.priceOld !== featured.priceNew && <del><span className="sr-only">Original price: </span>{featured.priceOld}</del>}
                </p>
              ) : <p className={styles.noFeatured}>{loading ? "Loading the collection…" : dealsFromApi ? "No featured deals available right now." : "We couldn’t load the deal feed. Please try again."}</p>}
              {!loading && !dealsFromApi ? (
                <HomepageFeedRetry feed="deals" className={`${styles.retryButton} ${styles.dealAction}`} />
              ) : (
                <DealLink deal={featured} className={styles.dealAction}>
                  {featured ? "View Deal" : "Explore Deals"} <Arrow diagonal />
                </DealLink>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className={styles.infoStrip} aria-label="Collection at a glance" aria-busy={loading}>
        <p className={styles.stripStatement}>Good games.<br /><span>Better possibilities.</span></p>
        <div><strong>{dealCount?.toLocaleString("en-US") ?? "—"}</strong><span>{loading ? "Loading deal count" : dealCount === null ? "Deal count unavailable" : "Deals in the catalog"}</span></div>
        <div><strong>{giveawayCount?.toLocaleString("en-US") ?? "—"}</strong><span>{loading ? "Loading giveaway count" : giveawayCount === null ? "Giveaway count unavailable" : "Active giveaways"}</span></div>
        <div><strong>{storeCount?.toLocaleString("en-US") ?? "—"}</strong><span>{loading ? "Loading store count" : storeCount === null ? "Store count unavailable" : "Stores in available feeds"}</span></div>
      </section>

      <section className={styles.collection} aria-labelledby="trending-title" aria-busy={loading}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.sectionEyebrow}>THE NEXT ON YOUR LIST</p><h2 id="trending-title">Trending Deals<span>.</span></h2></div>
          <Link href="/deals" className={styles.textLink}>All deals <Arrow /></Link>
        </div>
        {dealsFromApi && deals.length > 0 && <p className={styles.sourceNote}>A selection from the current deal catalog.</p>}
        <div className={styles.cardGrid}>
          {loading ? <LoadingCards /> : deals.slice(0, 3).map((deal, index) => (
            <article className={styles.card} key={deal.id}>
              <div className={styles.cardArt}><BrandArtwork compact tone={index} /><span className={styles.cardBadge}>{deal.discount}</span></div>
              <div className={styles.cardMeta}><span>{deal.store}</span><span>{deal.category}</span></div>
              <h3>{deal.title}</h3>
              <div className={styles.cardBottom}>
                <p><strong><span className="sr-only">Current price: </span>{deal.priceNew}</strong>{deal.priceOld !== deal.priceNew && <del><span className="sr-only">Original price: </span>{deal.priceOld}</del>}</p>
                <DealLink deal={deal}><Arrow diagonal /></DealLink>
              </div>
            </article>
          ))}
        </div>
        {!loading && deals.length === 0 && (
          <p className={styles.empty}>
            {dealsFromApi ? "No deals in the collection right now." : "Deals unavailable. We couldn’t load the feed. Please try again."}
            {dealsFromApi ? <Link href="/deals">Explore Deals <Arrow /></Link> : <HomepageFeedRetry feed="deals" className={styles.retryButton} />}
          </p>
        )}
      </section>

      <section className={styles.collection} aria-labelledby="giveaway-title" aria-busy={loading}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.sectionEyebrow}>GREAT GAMES. ZERO PRICE TAG.</p><h2 id="giveaway-title">Live Giveaways<span>.</span></h2></div>
          <Link href="/giveaways" className={styles.textLink}>All giveaways <Arrow /></Link>
        </div>
        {giveawaysFromApi && giveaways.length > 0 && <p className={styles.sourceNote}>Explore the current giveaway catalog. Check each store for availability.</p>}
        <div className={styles.cardGrid}>
          {loading ? <LoadingCards /> : giveaways.slice(0, 3).map((giveaway, index) => (
            <article className={styles.card} key={giveaway.id}>
              <div className={styles.cardArt}><BrandArtwork compact tone={index + 1} /><span className={`${styles.cardBadge} ${styles.freeBadge}`}>FREE</span></div>
              <div className={styles.cardMeta}><span>{giveaway.platformLabel}</span><span>{giveaway.genre}</span></div>
              <h3>{giveaway.title}</h3>
              <div className={styles.cardBottom}>
                <p className={styles.giveawayCaption}>Find your next free game</p>
                <Link href="/giveaways" aria-label={`View giveaways including ${giveaway.title}`}><Arrow diagonal /></Link>
              </div>
            </article>
          ))}
        </div>
        {!loading && giveaways.length === 0 && (
          <p className={styles.empty}>
            {giveawaysFromApi ? "No active giveaways in the collection right now." : "Giveaways unavailable. We couldn’t load the feed. Please try again."}
            {giveawaysFromApi ? <Link href="/giveaways">Explore Giveaways <Arrow /></Link> : <HomepageFeedRetry feed="giveaways" className={styles.retryButton} />}
          </p>
        )}
      </section>
    </>
  );
}

function LoadingCards() {
  return <>{[0, 1, 2].map((index) => <div className={styles.loadingCard} key={index} aria-hidden="true"><BrandArtwork compact tone={index} /><span /><span /></div>)}</>;
}

async function HomepageFeed() {
  const [deals, giveaways, summary] = await Promise.all([getDeals(), getGiveaways(), getDashboardSummary()]);
  return <HomePresentation data={{ deals, giveaways, summary }} />;
}

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <HomeNavigation />
        <main id="main-content" tabIndex={-1}>
          <Suspense fallback={<HomePresentation />}><HomepageFeed /></Suspense>
        </main>
        <footer className={styles.footer}>
          <Link href="/" className={styles.footerBrand}>NEXORA<span>.</span></Link>
          <p>Your next great game is out there.</p>
          <Link href="/wishlist">Make it your next wishlist find <Arrow /></Link>
        </footer>
      </div>
    </div>
  );
}
