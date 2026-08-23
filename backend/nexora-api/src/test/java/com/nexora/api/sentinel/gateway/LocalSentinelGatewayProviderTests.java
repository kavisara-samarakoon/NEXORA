package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class LocalSentinelGatewayProviderTests {

    @Test
    void returnsSafeLocalGuidanceForEveryContext() {
        LocalSentinelGatewayProvider provider = new LocalSentinelGatewayProvider();

        for (SentinelInsightContext context : SentinelInsightContext.values()) {
            SentinelInsightResponse response = provider.createInsight(context);

            assertAll(
                    () -> assertEquals("local-foundation", response.mode()),
                    () -> assertEquals("local", response.provider()),
                    () -> assertEquals(context.apiValue(), response.context()),
                    () -> assertFalse(response.answer().isBlank()),
                    () -> assertFalse(response.recommendations().isEmpty()),
                    () -> assertFalse(response.safetyNotes().isEmpty()),
                    () -> assertFalse(response.nextActions().isEmpty())
            );
        }
    }
}
