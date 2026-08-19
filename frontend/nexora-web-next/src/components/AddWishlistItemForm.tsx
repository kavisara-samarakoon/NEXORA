"use client";

import { useState, type FormEvent } from "react";
import type { WishlistItem, WishlistPriority, WishlistStatus, WishlistStore } from "@/data/wishlist";
import {
  addMyWishlistItem,
  normalizeUserWishlistError,
  type AddWishlistItemPayload,
} from "@/lib/user-wishlist";

type AddWishlistItemFormProps = {
  token: string;
  onAdded: (item: WishlistItem) => void;
  onAuthenticationRequired: () => void;
};

function readRequiredText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export default function AddWishlistItemForm({
  token,
  onAdded,
  onAuthenticationRequired,
}: AddWishlistItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = readRequiredText(formData, "title");
    const currentPrice = readRequiredText(formData, "currentPrice");
    const targetPrice = readRequiredText(formData, "targetPrice");

    if (!title || !currentPrice || !targetPrice) {
      setMessage({ tone: "error", text: "Please check the wishlist details." });
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
      const item = await addMyWishlistItem(token, payload);
      onAdded(item);
      form.reset();
      setMessage({ tone: "success", text: `${item.title} was added to your personal wishlist.` });
    } catch (error) {
      const details = normalizeUserWishlistError(error);
      if (details.status === 401) onAuthenticationRequired();
      setMessage({ tone: "error", text: details.message });
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
        </div>
        <span className="wl-add-panel__badge">Personal</span>
      </div>

      <form className="wl-add-form" onSubmit={handleSubmit}>
        <label className="wl-add-form__field wl-add-form__field--wide">
          <span>Game title</span>
          <input name="title" type="text" required maxLength={180} placeholder="e.g. Hades II" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field">
          <span>Store</span>
          <select name="store" defaultValue="Steam" disabled={isSubmitting}>
            <option>Steam</option>
            <option>Epic Games</option>
            <option>GOG</option>
          </select>
        </label>
        <label className="wl-add-form__field">
          <span>Current price</span>
          <input name="currentPrice" type="text" required maxLength={40} placeholder="$39.99" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field">
          <span>Target price</span>
          <input name="targetPrice" type="text" required maxLength={40} placeholder="$24.99" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field">
          <span>Lowest ever <small>optional</small></span>
          <input name="lowestEver" type="text" maxLength={40} placeholder="Defaults to current" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field">
          <span>Discount <small>optional</small></span>
          <input name="discount" type="text" maxLength={20} placeholder="-25%" disabled={isSubmitting} />
        </label>
        <label className="wl-add-form__field">
          <span>Priority</span>
          <select name="priority" defaultValue="medium" disabled={isSubmitting}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="wl-add-form__field">
          <span>Status</span>
          <select name="status" defaultValue="tracking" disabled={isSubmitting}>
            <option value="tracking">Tracking</option>
            <option value="price-drop">Price drop</option>
            <option value="free-now">Free now</option>
          </select>
        </label>
        <label className="wl-add-form__check">
          <input name="alertActive" type="checkbox" defaultChecked disabled={isSubmitting} />
          <span>Alert active <small>Local toggle after creation; alert engine later.</small></span>
        </label>

        <div className="wl-add-form__actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add to personal wishlist"}
          </button>
          {message && (
            <p className={`wl-form-message wl-form-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
