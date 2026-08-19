package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class CheapSharkStoreDirectoryTests {

    private final CheapSharkStoreDirectory directory = new CheapSharkStoreDirectory();

    @Test
    void buildsTrimmedLookupAndPrefersActiveDuplicate() {
        Map<String, String> lookup = directory.toLookup(List.of(
                store(" 27 ", " Old Fanatical ", 0),
                store("27", " Fanatical ", "1"),
                store("23", " GameBillet ", true),
                store(" ", "Missing ID", 1),
                store("99", " ", 1)
        ));

        assertAll(
                () -> assertEquals(2, lookup.size()),
                () -> assertEquals("Fanatical", lookup.get("27")),
                () -> assertEquals("GameBillet", lookup.get("23")),
                () -> assertFalse(lookup.containsKey("99"))
        );
    }

    @Test
    void resolvesKnownUnknownAndBlankStoreIdsSafely() {
        Map<String, String> lookup = Map.of("27", "Fanatical");

        assertAll(
                () -> assertEquals("Fanatical", directory.storeName(lookup, " 27 ")),
                () -> assertEquals("Store 23", directory.storeName(lookup, " 23 ")),
                () -> assertEquals("Unknown Store", directory.storeName(lookup, "  ")),
                () -> assertEquals("Unknown Store", directory.storeName(lookup, null))
        );
    }

    private static CheapSharkStoreResponse store(String storeId, String storeName, Object isActive) {
        return new CheapSharkStoreResponse(storeId, storeName, isActive);
    }
}
