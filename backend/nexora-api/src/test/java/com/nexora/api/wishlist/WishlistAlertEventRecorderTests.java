package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class WishlistAlertEventRecorderTests {

    @Test
    void recordsOnlyTargetReachedEvaluations() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(repository);
        WishlistItem item = item();

        recorder.recordTargetReachedEvent(
                7L,
                item,
                new WishlistAlertEvaluation(false, "watching", "Still above target price."));

        verify(repository, never()).saveAndFlush(any());

        recorder.recordTargetReachedEvent(
                7L,
                item,
                new WishlistAlertEvaluation(true, "target-reached", "Target price reached."));

        ArgumentCaptor<WishlistAlertEvent> captor =
                ArgumentCaptor.forClass(WishlistAlertEvent.class);
        verify(repository).saveAndFlush(captor.capture());
        WishlistAlertEvent event = captor.getValue();
        assertAll(
                () -> assertEquals(7L, event.getUserId()),
                () -> assertEquals(42L, event.getWishlistItemId()),
                () -> assertEquals("$19.99", event.getCurrentPrice()),
                () -> assertEquals("$20.00", event.getTargetPrice()),
                () -> assertEquals("target-reached", event.getEvaluationState()),
                () -> assertEquals(true, event.isTargetReached())
        );
    }

    private static WishlistItem item() {
        return new WishlistItem(
                42L,
                "New Game",
                "Steam",
                "$19.99",
                "$20.00",
                "$19.99",
                null,
                "tracking",
                true,
                "medium",
                true,
                7L
        );
    }
}
