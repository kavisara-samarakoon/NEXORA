package com.nexora.api.deals;

import com.nexora.api.deals.persistence.DealRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Profile("dev")
public class DatabaseDealService implements DealCatalogService {

    private static final BigDecimal FIVE_STAR_RATING = new BigDecimal("4.5");
    private static final BigDecimal FOUR_STAR_RATING = new BigDecimal("4.0");
    private static final BigDecimal THREE_STAR_RATING = new BigDecimal("3.0");

    private final DealRepository dealRepository;

    public DatabaseDealService(DealRepository dealRepository) {
        this.dealRepository = dealRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Deal> getDeals() {
        return dealRepository.findActiveDeals().stream()
                .map(DatabaseDealService::toApiDeal)
                .toList();
    }

    private static Deal toApiDeal(com.nexora.api.deals.persistence.Deal deal) {
        BigDecimal rating = valueOrZero(deal.getGame().getRating());

        return new Deal(
                deal.getId(),
                deal.getStore().getName(),
                deal.getDiscountLabel(),
                deal.getDiscountValue() == null ? 0 : deal.getDiscountValue(),
                deal.getGame().getTitle(),
                deal.getPriceOld(),
                deal.getPriceNew(),
                valueOrZero(deal.getPriceValue()),
                rating,
                starsFor(rating),
                deal.getGame().getCategory(),
                deal.getStatus(),
                null
        );
    }

    static String starsFor(BigDecimal rating) {
        if (rating == null || rating.signum() <= 0) {
            return "";
        }
        if (rating.compareTo(FIVE_STAR_RATING) >= 0) {
            return "★★★★★";
        }
        if (rating.compareTo(FOUR_STAR_RATING) >= 0) {
            return "★★★★☆";
        }
        if (rating.compareTo(THREE_STAR_RATING) >= 0) {
            return "★★★☆☆";
        }
        return "★★☆☆☆";
    }

    private static BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
