"use client";

import { useState, type FormEvent } from "react";
import RequestIdSupportText from "@/components/RequestIdSupportText";
import type { WishlistItem, WishlistPriority, WishlistStatus, WishlistStore } from "@/data/wishlist";
import {
  addMyWishlistItem,
  normalizeUserWishlistError,
  withWishlistAuthRetry,
  type AddWishlistItemPayload,
} from "@/lib/user-wishlist";
import { normalizeTargetPriceInput } from "@/lib/target-price";

type AddWishlistItemFormProps = {
  token: string;
  onAdded: (item: WishlistItem) => void;
  onAuthenticationRequired: () => void;
  onTokenChanged: (token: string) => void;
};

function readRequiredText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export default function AddWishlistItemForm({
  token,
  onAdded,
  onAuthenticationRequired,
  onTokenChanged,
}: AddWishlistItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
    requestId?: string | null;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = readRequiredText(formData, "title");
    const currentPrice = readRequiredText(formData, "currentPrice");
    const targetPrice = normalizeTargetPriceInput(readRequiredText(formData, "targetPrice"));

    if (!title || !currentPrice) {
      setMessage({ tone: "error", text: "Enter both a game title and its current price." });
      return;
    }

    if (!targetPrice) {
      setMessage({ tone: "error", text: "Enter a valid price such as $15.00 or FREE." });
      return;
    }

    const lowestEver = readRequiredText(formData, "lowestEver");
    const discount = readRequiredText(formData, "discount");
    const payload: AddWishlistItemPayload = {
      title,
      store: formData.get("store") as WishlistStore,
      currentPrice,
      targetPrice,
      lowestEver: lowestEver || currentPrice,
      discount: discount || null,
      priority: formData.get("priority") as WishlistPriority,
      status: formData.get("status") as WishlistStatus,
      alertActive: formData.get("alertActive") === "on",
    };

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await withWishlistAuthRetry(
        token,
        (activeToken) => addMyWishlistItem(activeToken, payload),
      );
      const item = result.value;
      onTokenChanged(result.token);
      onAdded(item);
      form.reset();
      setMessage({ tone: "success", text: `${item.title} was added to your personal wishlist.` });
    } catch (error) {
      const details = normalizeUserWishlistError(error);
      if (details.status === 401) onAuthenticationRequired();
      setMessage({
        tone: "error",
        text: details.message,
        requestId: details.requestId,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="wl-add-panel" id="add-personal-wishlist-item" aria-labelledby="wl-add-title">
      <div className="wl-add-panel__heading">
        <div>
          <span>Account collection</span>
          <h2 id="wl-add-title">Add personal wishlist item</h2>
          <p id="wl-add-help">Saved to this account. Price labels are recorded as entered; NEXORA does not verify the store price during creation.</p>
        </div>
        <span className="wl-add-panel__badge">Personal</span>
      </div>

      <form
        className="wl-add-form"
        aria-busy={isSubmitting}
        aria-describedby={message ? "wl-add-help wl-add-message" : "wl-add-help"}
        onSubmit={handleSubmit}
      >
        <label className="wl-add-form__field wl-add-form__field--wide" htmlFor="wl-add-title-input">
          <span>Game title</span>
          <input id="wl-add-title-input" name="title" type="text" required maxLength={180} placeholder="e.g. Hades II" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-store">
          <span>Store</span>
          <select id="wl-add-store" name="store" defaultValue="Steam" disabled={isSubmitting}>
            <option>Steam</option>
            <option>Epic Games</option>
            <option>GOG</option>
          </select>
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-current-price">
          <span>Current price</span>
          <input id="wl-add-current-price" name="currentPrice" type="text" required maxLength={40} placeholder="$39.99" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-target-price">
          <span>Target price</span>
          <input id="wl-add-target-price" name="targetPrice" type="text" required maxLength={40} placeholder="$24.99" disabled={isSubmitting} aria-describedby="wl-add-target-help" />
          <small id="wl-add-target-help">Use a value such as $15.00 or FREE.</small>
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-lowest-ever">
          <span>Lowest ever <small>optional</small></span>
          <input id="wl-add-lowest-ever" name="lowestEver" type="text" maxLength={40} placeholder="Defaults to current" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-discount">
          <span>Discount <small>optional</small></span>
          <input id="wl-add-discount" name="discount" type="text" maxLength={20} placeholder="-25%" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-priority">
          <span>Priority</span>
          <select id="wl-add-priority" name="priority" defaultValue="medium" disabled={isSubmitting}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="wl-add-form__field" htmlFor="wl-add-status">
          <span>Status</span>
          <select id="wl-add-status" name="status" defaultValue="tracking" disabled={isSubmitting}>
            <option value="tracking">Tracking</option>
            <option value="price-drop">Price drop</option>
            <option value="free-now">Free now</option>
          </select>
        </label>
        <label className="wl-add-form__check" htmlFor="wl-add-alert-active">
          <input id="wl-add-alert-active" name="alertActive" type="checkbox" defaultChecked disabled={isSubmitting} aria-describedby="wl-add-alert-help" />
          <span>Alert active <small id="wl-add-alert-help">Enables account-side evaluation. Notification delivery depends on locally configured providers.</small></span>
        </label>

        <div className="wl-add-form__actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add to personal wishlist"}
          </button>
          {message && (
            <p className={`wl-form-message wl-form-message--${message.tone}`} id="wl-add-message" role={message.tone === "error" ? "alert" : "status"}>
              <span aria-hidden="true">{message.tone === "success" ? "✓" : "!"}</span>
              <span>
                <strong>{message.tone === "success" ? "Wishlist item added" : "Check this form"}</strong>
                <small>{message.text}</small>
                {message.tone === "error" ? (
                  <RequestIdSupportText requestId={message.requestId} />
                ) : null}
              </span>
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
