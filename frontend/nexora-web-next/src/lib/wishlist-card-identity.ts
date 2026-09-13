type WishlistCardIdentityContext = {
  accountRevision: number;
  source: "api" | "fallback";
  view: "checking" | "public" | "personal" | "offline";
};

type WishlistCardIdentityItem = {
  id: number;
  store: string;
  title: string;
};

export function wishlistCardIdentity(
  context: WishlistCardIdentityContext,
  item: WishlistCardIdentityItem,
): string {
  const ownershipScope = context.view === "personal"
    ? `account-${context.accountRevision}`
    : "public-preview";

  return JSON.stringify([
    context.view,
    ownershipScope,
    context.source,
    item.id,
    item.store,
    item.title,
  ]);
}
