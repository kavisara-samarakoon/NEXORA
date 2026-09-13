export function hasAvailableDealRating(rating: number, stars: string): boolean {
  return Number.isFinite(rating) && rating > 0 && rating <= 5 && stars.trim().length > 0;
}

export function isValidDealRatingPayload(rating: unknown, stars: unknown): boolean {
  if (
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5 ||
    typeof stars !== "string"
  ) {
    return false;
  }

  return rating === 0 ? stars.trim().length === 0 : hasAvailableDealRating(rating, stars);
}
