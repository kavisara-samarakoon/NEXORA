package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SentinelAiPropertiesTests {

    @Test
    void safetyDefaultsPreserveExistingLocalLimits() {
        SentinelAiProperties.Safety safety = new SentinelAiProperties().getSafety();

        assertAll(
                () -> assertEquals(60, safety.boundedRateLimitWindowSeconds()),
                () -> assertEquals(12, safety.boundedRateLimitMaxRequests()),
                () -> assertEquals(3_500, safety.boundedMaxContextPromptCharacters()),
                () -> assertEquals(4_000, safety.boundedMaxAnswerCharacters()));
    }

    @Test
    void invalidLowAndHighSafetyValuesAreBounded() {
        SentinelAiProperties.Safety safety = new SentinelAiProperties().getSafety();
        safety.setRateLimitWindowSeconds(Integer.MIN_VALUE);
        safety.setRateLimitMaxRequests(Integer.MAX_VALUE);
        safety.setMaxContextPromptCharacters(Integer.MIN_VALUE);
        safety.setMaxAnswerCharacters(Integer.MAX_VALUE);

        assertAll(
                () -> assertEquals(
                        SentinelAiProperties.Safety.MIN_RATE_LIMIT_WINDOW_SECONDS,
                        safety.boundedRateLimitWindowSeconds()),
                () -> assertEquals(
                        SentinelAiProperties.Safety.MAX_RATE_LIMIT_MAX_REQUESTS,
                        safety.boundedRateLimitMaxRequests()),
                () -> assertEquals(
                        SentinelAiProperties.Safety.MIN_CONTEXT_PROMPT_CHARACTERS,
                        safety.boundedMaxContextPromptCharacters()),
                () -> assertEquals(
                        SentinelAiProperties.Safety.MAX_ANSWER_CHARACTERS,
                        safety.boundedMaxAnswerCharacters()));
    }
}
