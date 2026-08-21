package com.nexora.api.wishlist;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "nexora.wishlist.price-refresh")
public class WishlistPriceRefreshProperties {

    private String provider = "stored";
    private CheapShark cheapshark = new CheapShark();

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public CheapShark getCheapshark() {
        return cheapshark;
    }

    public void setCheapshark(CheapShark cheapshark) {
        this.cheapshark = cheapshark;
    }

    public static class CheapShark {

        private static final int MAX_PAGE_SIZE = 24;

        private boolean enabled;
        private int pageSize = 8;
        private boolean matchStore = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getPageSize() {
            return Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));
        }

        public void setPageSize(int pageSize) {
            this.pageSize = pageSize;
        }

        public boolean isMatchStore() {
            return matchStore;
        }

        public void setMatchStore(boolean matchStore) {
            this.matchStore = matchStore;
        }
    }
}
