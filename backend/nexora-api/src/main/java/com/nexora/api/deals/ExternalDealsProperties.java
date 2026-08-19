package com.nexora.api.deals;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "nexora.external-deals")
public class ExternalDealsProperties {

    private boolean enabled = true;
    private int timeoutSeconds = 5;
    private int defaultPageSize = 12;
    private int maxPageSize = 24;
    private CheapShark cheapshark = new CheapShark();
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

    public int getDefaultPageSize() {
        return defaultPageSize;
    }

    public void setDefaultPageSize(int defaultPageSize) {
        this.defaultPageSize = defaultPageSize;
    }

    public int getMaxPageSize() {
        return maxPageSize;
    }

    public void setMaxPageSize(int maxPageSize) {
        this.maxPageSize = maxPageSize;
    }

    public CheapShark getCheapshark() {
        return cheapshark;
    }

    public void setCheapshark(CheapShark cheapshark) {
        this.cheapshark = cheapshark;
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

    public static class CheapShark {

        private String baseUrl = "https://www.cheapshark.com/api/1.0";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }
    }

    public static class Cache {

        private boolean enabled = true;
        private int dealsTtlSeconds = 300;
        private int storesTtlSeconds = 21_600;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getDealsTtlSeconds() {
            return Math.max(1, dealsTtlSeconds);
        }

        public void setDealsTtlSeconds(int dealsTtlSeconds) {
            this.dealsTtlSeconds = Math.max(1, dealsTtlSeconds);
        }

        public int getStoresTtlSeconds() {
            return Math.max(1, storesTtlSeconds);
        }

        public void setStoresTtlSeconds(int storesTtlSeconds) {
            this.storesTtlSeconds = Math.max(1, storesTtlSeconds);
        }

        public Duration dealsTtl() {
            return Duration.ofSeconds(getDealsTtlSeconds());
        }

        public Duration storesTtl() {
            return Duration.ofSeconds(getStoresTtlSeconds());
        }
    }
}
