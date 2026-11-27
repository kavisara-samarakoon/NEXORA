package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
@Profile("dev")
public class DatabaseUserWishlistService implements UserWishlistService {

    static final int MAX_REFRESH_ITEMS_PER_REQUEST = WishlistRefreshSupport.MAX_REFRESH_ITEMS_PER_REQUEST;
    private static final String REFRESH_SOURCE = WishlistRefreshSupport.REFRESH_SOURCE;

    private final WishlistItemRepository wishlistItemRepository;
    private final WishlistAlertEventRepository wishlistAlertEventRepository;
    private final WishlistAlertEventRecorder wishlistAlertEventRecorder;
    private final WishlistPriceHistoryService wishlistPriceHistoryService;
    private final CheapSharkWishlistLiveLookup liveLookup;
    private final TransactionOperations readOperations;
    private final TransactionOperations writeOperations;
    private final TransactionOperations isolatedInsertOperations;
    private final ConcurrentHashMap<Long, ReentrantLock> userRefreshLocks = new ConcurrentHashMap<>();

    public DatabaseUserWishlistService(
            WishlistItemRepository wishlistItemRepository,
            WishlistAlertEventRepository wishlistAlertEventRepository,
            WishlistAlertEventRecorder wishlistAlertEventRecorder,
            WishlistPriceHistoryService wishlistPriceHistoryService) {
        this(
                wishlistItemRepository,
                wishlistAlertEventRepository,
                wishlistAlertEventRecorder,
                wishlistPriceHistoryService,
                null,
                null
        );
    }

    public DatabaseUserWishlistService(
            WishlistItemRepository wishlistItemRepository,
            WishlistAlertEventRepository wishlistAlertEventRepository,
            WishlistAlertEventRecorder wishlistAlertEventRecorder,
            WishlistPriceHistoryService wishlistPriceHistoryService,
            CheapSharkWishlistLiveLookup liveLookup) {
        this(
                wishlistItemRepository,
                wishlistAlertEventRepository,
                wishlistAlertEventRecorder,
                wishlistPriceHistoryService,
                liveLookup,
                null
        );
    }

    @Autowired
    public DatabaseUserWishlistService(
            WishlistItemRepository wishlistItemRepository,
            WishlistAlertEventRepository wishlistAlertEventRepository,
            WishlistAlertEventRecorder wishlistAlertEventRecorder,
            WishlistPriceHistoryService wishlistPriceHistoryService,
            CheapSharkWishlistLiveLookup liveLookup,
            PlatformTransactionManager transactionManager) {
        this.wishlistItemRepository = wishlistItemRepository;
        this.wishlistAlertEventRepository = wishlistAlertEventRepository;
        this.wishlistAlertEventRecorder = wishlistAlertEventRecorder;
        this.wishlistPriceHistoryService = wishlistPriceHistoryService;
        this.liveLookup = liveLookup;
        if (transactionManager == null) {
            this.readOperations = TransactionOperations.withoutTransaction();
            this.writeOperations = TransactionOperations.withoutTransaction();
            this.isolatedInsertOperations = TransactionOperations.withoutTransaction();
        } else {
            TransactionTemplate readTemplate = new TransactionTemplate(transactionManager);
            readTemplate.setReadOnly(true);
            this.readOperations = readTemplate;

            this.writeOperations = new TransactionTemplate(transactionManager);

            TransactionTemplate insertTemplate = new TransactionTemplate(transactionManager);
            insertTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            this.isolatedInsertOperations = insertTemplate;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistItem> getWishlistItems(long userId) {
        return wishlistItemRepository.findByUserIdAndActiveTrueOrderById(userId).stream()
                .map(WishlistItemMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistAlertEventResponse> getWishlistAlertEvents(long userId) {
        return wishlistAlertEventRepository.findByUserIdOrderByCreatedAtDescIdDesc(
                        userId,
                        PageRequest.of(0, WishlistAlertHistoryPolicy.RESPONSE_LIMIT)
                ).stream()
                .map(WishlistAlertEventMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistPriceHistoryPoint> getWishlistPriceHistory(
            long userId, long itemId, int limit) {
        wishlistItemRepository.findByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        return wishlistPriceHistoryService.listRecent(userId, itemId, limit);
    }

    @Override
    public WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request) {
        WishlistItemValues values = WishlistItemValues.from(request);
        Optional<com.nexora.api.wishlist.persistence.WishlistItem> existing = readOperations.execute(
                status -> wishlistItemRepository
                        .findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                                userId,
                                values.title(),
                                values.store()
                        )
        );
        if (existing != null && existing.isPresent()) {
            return WishlistItemMapper.toResponse(existing.get());
        }

        try {
            return isolatedInsertOperations.execute(status -> saveWishlistItem(userId, values));
        } catch (DataIntegrityViolationException conflict) {
            Optional<com.nexora.api.wishlist.persistence.WishlistItem> winning = readOperations.execute(
                    status -> wishlistItemRepository
                            .findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                                    userId,
                                    values.title(),
                                    values.store()
                            )
            );
            if (winning != null && winning.isPresent()) {
                return WishlistItemMapper.toResponse(winning.get());
            }
            throw conflict;
        }
    }

    private WishlistItem saveWishlistItem(long userId, WishlistItemValues values) {
        com.nexora.api.wishlist.persistence.WishlistItem savedItem =
                wishlistItemRepository.saveAndFlush(
                        new com.nexora.api.wishlist.persistence.WishlistItem(
                                null,
                                values.title(),
                                values.store(),
                                values.currentPrice(),
                                values.targetPrice(),
                                values.lowestEver(),
                                values.discount(),
                                values.status(),
                                values.alertActive(),
                                values.priority(),
                                true,
                                userId,
                                values.externalGameId(),
                                values.externalDealId(),
                                values.currency(),
                                values.thumbUrl(),
                                values.priceSource(),
                                values.lowestEverSource()
                        )
                );
        wishlistPriceHistoryService.recordSnapshot(userId, savedItem, "wishlist-create");
        WishlistAlertEvaluation evaluation = evaluate(savedItem);
        if (evaluation.targetReached()) {
            wishlistAlertEventRecorder.recordTargetReachedEvent(
                    userId, savedItem, evaluation, "wishlist-create");
        }
        return WishlistItemMapper.toResponse(savedItem);
    }

    @Override
    @Transactional
    public WishlistItem updateWishlistAlert(
            long userId, long itemId, UpdateWishlistAlertRequest request) {
        com.nexora.api.wishlist.persistence.WishlistItem item = wishlistItemRepository
                .findForUpdateByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        WishlistAlertEvaluation previousEvaluation = evaluate(item);
        item.updateAlertSettings(
                trimmed(request.targetPrice()),
                request.alertActive(),
                trimmed(request.priority())
        );
        com.nexora.api.wishlist.persistence.WishlistItem savedItem =
                wishlistItemRepository.saveAndFlush(item);
        WishlistAlertEvaluation newEvaluation = evaluate(savedItem);
        if (!previousEvaluation.targetReached() && newEvaluation.targetReached()) {
            wishlistAlertEventRecorder.recordTargetReachedEvent(
                    userId, savedItem, newEvaluation, "alert-update");
        }
        return WishlistItemMapper.toResponse(savedItem);
    }

    @Override
    @Transactional
    public void deleteWishlistItem(long userId, long itemId) {
        com.nexora.api.wishlist.persistence.WishlistItem item = wishlistItemRepository
                .findForUpdateByIdAndUserIdAndActiveTrue(itemId, userId)
                .orElseThrow(WishlistItemNotFoundException::new);
        item.deactivate();
        wishlistItemRepository.saveAndFlush(item);
    }

    @Override
    public UserWishlistRefreshResponse refreshWishlistPrices(long userId) {
        return refreshWishlistPrices(userId, null);
    }

    @Override
    public UserWishlistRefreshResponse refreshWishlistPrices(long userId, Long cursor) {
        ReentrantLock userLock = userRefreshLocks.computeIfAbsent(userId, ignored -> new ReentrantLock());
        userLock.lock();
        try {
            return performRefresh(userId, cursor);
        } finally {
            userLock.unlock();
        }
    }

    private UserWishlistRefreshResponse performRefresh(long userId, Long cursor) {
        List<com.nexora.api.wishlist.persistence.WishlistItem> allItems = readOperations.execute(
                status -> wishlistItemRepository.findByUserIdAndActiveTrueOrderById(userId)
        );
        if (allItems == null) {
            allItems = List.of();
        }

        if (liveLookup == null || !liveLookup.isEnabled()) {
            int unavailable = Math.min(allItems.size(), MAX_REFRESH_ITEMS_PER_REQUEST);
            return new UserWishlistRefreshResponse(
                    unavailable,
                    0,
                    0,
                    0,
                    0,
                    unavailable,
                    "disabled",
                    "USD",
                    Instant.now(),
                    false,
                    null,
                    allItems.stream().map(WishlistItemMapper::toResponse).toList()
            );
        }

        List<com.nexora.api.wishlist.persistence.WishlistItem> eligibleUsd = allItems.stream()
                .filter(item -> WishlistRefreshSupport.isUsdEligible(
                        WishlistPriceParser.establishStoredCurrency(
                                item.getCurrentPrice(), item.getTargetPrice(), item.getCurrency())))
                .toList();
        int ineligibleCount = cursor == null ? allItems.size() - eligibleUsd.size() : 0;

        WishlistRefreshSupport.BatchSelection<com.nexora.api.wishlist.persistence.WishlistItem> selection =
                WishlistRefreshSupport.selectBatch(
                        eligibleUsd,
                        cursor,
                        com.nexora.api.wishlist.persistence.WishlistItem::getId,
                        MAX_REFRESH_ITEMS_PER_REQUEST
                );

        if (selection.batch().isEmpty()) {
            return new UserWishlistRefreshResponse(
                    ineligibleCount,
                    0,
                    0,
                    0,
                    0,
                    ineligibleCount,
                    "cheapshark",
                    "USD",
                    Instant.now(),
                    false,
                    null,
                    allItems.stream().map(WishlistItemMapper::toResponse).toList()
            );
        }

        // Resolve provider store map once and perform HTTP calls outside database transactions.
        Map<String, String> storeLookup = liveLookup.loadStoreLookup();
        List<LookupResult> lookupResults = new ArrayList<>(selection.batch().size());
        for (com.nexora.api.wishlist.persistence.WishlistItem candidate : selection.batch()) {
            Optional<CheapSharkWishlistLiveLookup.ObservedOffer> found = storeLookup.isEmpty()
                    ? Optional.empty()
                    : liveLookup.lookup(
                            candidate.getTitle(),
                            candidate.getStore(),
                            candidate.getExternalGameId(),
                            storeLookup
                    );
            lookupResults.add(new LookupResult(candidate.getId(), found));
        }

        return writeOperations.execute(status -> persistRefreshResults(
                userId,
                lookupResults,
                ineligibleCount,
                selection.hasMore(),
                selection.nextCursor()
        ));
    }

    private UserWishlistRefreshResponse persistRefreshResults(
            long userId,
            List<LookupResult> lookupResults,
            int ineligibleCount,
            boolean hasMore,
            Long nextCursor) {
        int scanned = ineligibleCount;
        int matched = 0;
        int updated = 0;
        int observationsRecorded = 0;
        int targetEventsCreated = 0;
        int unavailable = ineligibleCount;
        LocalDateTime checkedAt = LocalDateTime.now(ZoneOffset.UTC);

        for (LookupResult result : lookupResults) {
            Optional<com.nexora.api.wishlist.persistence.WishlistItem> loaded =
                    wishlistItemRepository.findForUpdateByIdAndUserIdAndActiveTrue(result.itemId(), userId);
            if (loaded.isEmpty()) {
                continue;
            }
            scanned++;
            com.nexora.api.wishlist.persistence.WishlistItem item = loaded.get();
            item.markChecked(checkedAt);

            if (result.offer().isEmpty()) {
                wishlistItemRepository.saveAndFlush(item);
                unavailable++;
                continue;
            }

            CheapSharkWishlistLiveLookup.ObservedOffer offer = result.offer().get();
            if (!WishlistRefreshSupport.canApplyOffer(item.getExternalGameId(), offer)
                    || !WishlistRefreshSupport.isUsdEligible(
                    WishlistPriceParser.establishStoredCurrency(
                            item.getCurrentPrice(), item.getTargetPrice(), item.getCurrency()))) {
                wishlistItemRepository.saveAndFlush(item);
                unavailable++;
                continue;
            }

            matched++;
            boolean previouslyReached = WishlistRefreshSupport.isVerifiedProviderSource(item.getPriceSource())
                    && evaluate(item).targetReached();
            if (WishlistRefreshSupport.applyVerifiedOffer(item, offer, REFRESH_SOURCE)) {
                updated++;
            }
            wishlistItemRepository.saveAndFlush(item);

            if (wishlistPriceHistoryService.recordSnapshot(userId, item, REFRESH_SOURCE)) {
                observationsRecorded++;
            }

            WishlistAlertEvaluation newEvaluation = evaluate(item);
            if (!previouslyReached
                    && newEvaluation.targetReached()
                    && wishlistAlertEventRecorder.recordTargetReachedEvent(
                    userId, item, newEvaluation, REFRESH_SOURCE)) {
                targetEventsCreated++;
            }
        }

        List<WishlistItem> refreshedItems = wishlistItemRepository
                .findByUserIdAndActiveTrueOrderById(userId).stream()
                .map(WishlistItemMapper::toResponse)
                .toList();

        return new UserWishlistRefreshResponse(
                scanned,
                matched,
                updated,
                observationsRecorded,
                targetEventsCreated,
                unavailable,
                "cheapshark",
                "USD",
                Instant.now(),
                hasMore,
                nextCursor,
                refreshedItems
        );
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    private static WishlistAlertEvaluation evaluate(
            com.nexora.api.wishlist.persistence.WishlistItem item) {
        String currency = WishlistPriceParser.establishStoredCurrency(
                item.getCurrentPrice(), item.getTargetPrice(), item.getCurrency());
        return WishlistAlertEvaluator.evaluate(
                item.getCurrentPrice(),
                item.getTargetPrice(),
                item.isAlertActive(),
                currency
        );
    }

    private record LookupResult(
            long itemId,
            Optional<CheapSharkWishlistLiveLookup.ObservedOffer> offer) {
    }
}
