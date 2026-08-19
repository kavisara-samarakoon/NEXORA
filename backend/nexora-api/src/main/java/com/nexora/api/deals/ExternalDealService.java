package com.nexora.api.deals;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ExternalDealService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExternalDealService.class);

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkDealMapper cheapSharkDealMapper;
    private final DealCatalogService localDeals;
    private final ExternalDealsProperties properties;

    public ExternalDealService(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkDealMapper cheapSharkDealMapper,
            DealCatalogService localDeals,
            ExternalDealsProperties properties) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.cheapSharkDealMapper = cheapSharkDealMapper;
        this.localDeals = localDeals;
        this.properties = properties;
    }

    public List<Deal> getDeals(String title, Integer pageSize, BigDecimal upperPrice) {
        if (!properties.isEnabled()) {
            return localDeals.getDeals();
        }

        int requestedPageSize = pageSize == null ? properties.getDefaultPageSize() : pageSize;
        int maxPageSize = Math.max(1, properties.getMaxPageSize());
        int effectivePageSize = Math.max(1, Math.min(requestedPageSize, maxPageSize));
        String effectiveTitle = normalizeTitle(title);

        try {
            List<CheapSharkDealResponse> responses = cheapSharkDealClient.getDeals(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice
            );
            return cheapSharkDealMapper.toDeals(responses);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "CheapShark deals unavailable; serving the local deals fallback ({})",
                    exception.getMessage()
            );
            return localDeals.getDeals();
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null) return null;
        String normalized = title.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
