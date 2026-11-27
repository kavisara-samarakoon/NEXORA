package com.nexora.api.deals;

import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class CheapSharkStoreDirectory {

    public Map<String, String> toLookup(List<CheapSharkStoreResponse> responses) {
        if (responses == null || responses.isEmpty()) return Map.of();

        Map<String, StoreEntry> entries = new LinkedHashMap<>();
        for (CheapSharkStoreResponse response : responses) {
            if (response == null || isBlank(response.storeID()) || isBlank(response.storeName())) {
                continue;
            }

            String storeId = response.storeID().trim();
            StoreEntry candidate = new StoreEntry(response.storeName().trim(), activityRank(response.isActive()));
            StoreEntry existing = entries.get(storeId);
            if (existing == null || candidate.activityRank() > existing.activityRank()) {
                entries.put(storeId, candidate);
            }
        }

        Map<String, String> lookup = new LinkedHashMap<>();
        entries.forEach((storeId, entry) -> lookup.put(storeId, entry.name()));
        return Map.copyOf(lookup);
    }

    public List<DealStoreOption> toActiveStoreOptions(Map<String, String> lookup) {
        if (lookup == null || lookup.isEmpty()) {
            return List.of();
        }
        return lookup.entrySet().stream()
                .map(entry -> new DealStoreOption(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(DealStoreOption::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public String storeName(Map<String, String> lookup, String storeId) {
        if (isBlank(storeId)) return "Unknown Store";

        String normalizedStoreId = storeId.trim();
        if (lookup == null) return "Store " + normalizedStoreId;

        String mappedName = lookup.get(normalizedStoreId);
        return isBlank(mappedName) ? "Store " + normalizedStoreId : mappedName.trim();
    }

    private static int activityRank(Object isActive) {
        if (isActive instanceof Boolean active) return active ? 1 : -1;
        if (isActive instanceof Number number) return number.intValue() == 0 ? -1 : 1;
        if (isActive instanceof String value) {
            String normalized = value.trim();
            if ("1".equals(normalized) || "true".equalsIgnoreCase(normalized)) return 1;
            if ("0".equals(normalized) || "false".equalsIgnoreCase(normalized)) return -1;
        }
        return 0;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record StoreEntry(String name, int activityRank) {
    }
}
