package com.nexora.api.wishlist;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

final class WishlistPriceSnapshotMatcher {

    private static final int MIN_CONTAINS_TOKENS = 3;
    private static final int MAX_EXTRA_TOKENS = 2;
    private static final double MIN_LENGTH_RATIO = 0.6;

    private WishlistPriceSnapshotMatcher() {
    }

    static TitleMatch titleMatch(String wishlistTitle, String dealTitle) {
        String normalizedWishlistTitle = normalize(wishlistTitle);
        String normalizedDealTitle = normalize(dealTitle);
        if (normalizedWishlistTitle.isEmpty() || normalizedDealTitle.isEmpty()) {
            return TitleMatch.NONE;
        }
        if (normalizedWishlistTitle.equals(normalizedDealTitle)) {
            return TitleMatch.EXACT;
        }
        return isSafeContainsMatch(normalizedWishlistTitle, normalizedDealTitle)
                ? TitleMatch.SAFE_CONTAINS
                : TitleMatch.NONE;
    }

    static boolean storeMatches(String wishlistStore, String dealStore) {
        String normalizedWishlistStore = normalize(wishlistStore);
        return !normalizedWishlistStore.isEmpty()
                && normalizedWishlistStore.equals(normalize(dealStore));
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("['’‘`]", "")
                .replaceAll("[\\p{P}\\p{S}]+", " ")
                .trim();
        return normalized.replaceAll("\\s+", " ");
    }

    private static boolean isSafeContainsMatch(String firstTitle, String secondTitle) {
        List<String> firstTokens = tokens(firstTitle);
        List<String> secondTokens = tokens(secondTitle);
        List<String> shorter = firstTokens.size() <= secondTokens.size()
                ? firstTokens : secondTokens;
        List<String> longer = firstTokens.size() <= secondTokens.size()
                ? secondTokens : firstTokens;

        if (shorter.size() < MIN_CONTAINS_TOKENS
                || longer.size() - shorter.size() > MAX_EXTRA_TOKENS) {
            return false;
        }

        String shorterTitle = String.join(" ", shorter);
        String longerTitle = String.join(" ", longer);
        if ((double) shorterTitle.length() / longerTitle.length() < MIN_LENGTH_RATIO) {
            return false;
        }

        for (int start = 0; start <= longer.size() - shorter.size(); start++) {
            if (longer.subList(start, start + shorter.size()).equals(shorter)) {
                return true;
            }
        }
        return false;
    }

    private static List<String> tokens(String normalizedTitle) {
        return Arrays.asList(normalizedTitle.split(" "));
    }

    enum TitleMatch {
        NONE,
        SAFE_CONTAINS,
        EXACT
    }
}
