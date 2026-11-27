package com.nexora.api.giveaways;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "nexora.external-giveaways")
public class ExternalGiveawaysProperties {

    private boolean enabled = true;
    private int timeoutSeconds = 5;
    private GamerPower gamerpower = new GamerPower();
    private Cache cache = new Cache();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public GamerPower getGamerpower() {
        return gamerpower;
    }

    public void setGamerpower(GamerPower gamerpower) {
        this.gamerpower = gamerpower;
    }

    public Cache getCache() {
        return cache;
    }

    public void setCache(Cache cache) {
        this.cache = cache;
    }

    public Duration timeout() {
        return Duration.ofSeconds(Math.max(1, timeoutSeconds));
    }

    public static class GamerPower {

        private String baseUrl = "https://www.gamerpower.com/api";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    public static class Cache {

        private boolean enabled = true;
        private int ttlSeconds = 300;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getTtlSeconds() {
            return Math.max(1, ttlSeconds);
        }

        public void setTtlSeconds(int ttlSeconds) {
            this.ttlSeconds = Math.max(1, ttlSeconds);
        }

        public Duration ttl() {
            return Duration.ofSeconds(getTtlSeconds());
        }
    }
}
