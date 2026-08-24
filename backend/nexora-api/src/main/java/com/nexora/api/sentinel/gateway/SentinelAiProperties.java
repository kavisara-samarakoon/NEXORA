package com.nexora.api.sentinel.gateway;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;

@Component
@ConfigurationProperties(prefix = "nexora.sentinel.ai")
public class SentinelAiProperties {

    private String provider = "local";
    private Gemini gemini = new Gemini();
    private Safety safety = new Safety();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Gemini getGemini() {
        return gemini;
    }

    public void setGemini(Gemini gemini) {
        this.gemini = gemini;
    }

    public Safety getSafety() {
        return safety;
    }

    public void setSafety(Safety safety) {
        this.safety = safety;
    }

    public boolean isGeminiRequested() {
        return "gemini".equals(normalizedProvider());
    }

    public boolean isGeminiConfigured() {
        return isGeminiRequested() && !gemini.normalizedApiKey().isEmpty();
    }

    public String normalizedProvider() {
        return provider == null ? "local" : provider.trim().toLowerCase(Locale.ROOT);
    }

    public static class Gemini {

        private String apiKey = "";
        private String model = "gemini-3.6-flash";
        private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
        private int timeoutMs = 8_000;
        private int maxOutputTokens = 512;
        private double temperature = 0.2;

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public int getTimeoutMs() {
            return timeoutMs;
        }

        public void setTimeoutMs(int timeoutMs) {
            this.timeoutMs = timeoutMs;
        }

        public int getMaxOutputTokens() {
            return maxOutputTokens;
        }

        public void setMaxOutputTokens(int maxOutputTokens) {
            this.maxOutputTokens = maxOutputTokens;
        }

        public double getTemperature() {
            return temperature;
        }

        public void setTemperature(double temperature) {
            this.temperature = temperature;
        }

        public String normalizedApiKey() {
            return apiKey == null ? "" : apiKey.trim();
        }

        public String normalizedModel() {
            return model == null ? "" : model.trim();
        }

        public String normalizedBaseUrl() {
            if (baseUrl == null) {
                return "";
            }
            return baseUrl.trim().replaceAll("/+$", "");
        }

        public Duration timeout() {
            return Duration.ofMillis(Math.max(250, timeoutMs));
        }

        public int boundedMaxOutputTokens() {
            return Math.max(64, Math.min(maxOutputTokens, 2_048));
        }

        public double boundedTemperature() {
            if (!Double.isFinite(temperature)) {
                return 0.2;
            }
            return Math.max(0.0, Math.min(temperature, 2.0));
        }
    }

    public static class Safety {

        static final int MIN_RATE_LIMIT_WINDOW_SECONDS = 1;
        static final int MAX_RATE_LIMIT_WINDOW_SECONDS = 3_600;
        static final int MIN_RATE_LIMIT_MAX_REQUESTS = 1;
        static final int MAX_RATE_LIMIT_MAX_REQUESTS = 1_000;
        static final int MIN_CONTEXT_PROMPT_CHARACTERS = 256;
        static final int MAX_CONTEXT_PROMPT_CHARACTERS = 10_000;
        static final int MIN_ANSWER_CHARACTERS = 256;
        static final int MAX_ANSWER_CHARACTERS = 16_000;

        private boolean rateLimitEnabled = true;
        private int rateLimitWindowSeconds = 60;
        private int rateLimitMaxRequests = 12;
        private int maxContextPromptCharacters = SentinelContextSummary.MAX_PROMPT_CHARACTERS;
        private int maxAnswerCharacters = 4_000;

        public boolean isRateLimitEnabled() {
            return rateLimitEnabled;
        }

        public void setRateLimitEnabled(boolean rateLimitEnabled) {
            this.rateLimitEnabled = rateLimitEnabled;
        }

        public int getRateLimitWindowSeconds() {
            return rateLimitWindowSeconds;
        }

        public void setRateLimitWindowSeconds(int rateLimitWindowSeconds) {
            this.rateLimitWindowSeconds = rateLimitWindowSeconds;
        }

        public int getRateLimitMaxRequests() {
            return rateLimitMaxRequests;
        }

        public void setRateLimitMaxRequests(int rateLimitMaxRequests) {
            this.rateLimitMaxRequests = rateLimitMaxRequests;
        }

        public int getMaxContextPromptCharacters() {
            return maxContextPromptCharacters;
        }

        public void setMaxContextPromptCharacters(int maxContextPromptCharacters) {
            this.maxContextPromptCharacters = maxContextPromptCharacters;
        }

        public int getMaxAnswerCharacters() {
            return maxAnswerCharacters;
        }

        public void setMaxAnswerCharacters(int maxAnswerCharacters) {
            this.maxAnswerCharacters = maxAnswerCharacters;
        }

        public int boundedRateLimitWindowSeconds() {
            return bound(
                    rateLimitWindowSeconds,
                    MIN_RATE_LIMIT_WINDOW_SECONDS,
                    MAX_RATE_LIMIT_WINDOW_SECONDS);
        }

        public int boundedRateLimitMaxRequests() {
            return bound(
                    rateLimitMaxRequests,
                    MIN_RATE_LIMIT_MAX_REQUESTS,
                    MAX_RATE_LIMIT_MAX_REQUESTS);
        }

        public int boundedMaxContextPromptCharacters() {
            return bound(
                    maxContextPromptCharacters,
                    MIN_CONTEXT_PROMPT_CHARACTERS,
                    MAX_CONTEXT_PROMPT_CHARACTERS);
        }

        public int boundedMaxAnswerCharacters() {
            return bound(
                    maxAnswerCharacters,
                    MIN_ANSWER_CHARACTERS,
                    MAX_ANSWER_CHARACTERS);
        }

        private static int bound(int value, int minimum, int maximum) {
            return Math.max(minimum, Math.min(value, maximum));
        }
    }
}
