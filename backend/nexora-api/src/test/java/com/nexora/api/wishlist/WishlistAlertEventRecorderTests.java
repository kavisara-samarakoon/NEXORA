package com.nexora.api.wishlist;

import com.nexora.api.notifications.AlertNotificationRequest;
import com.nexora.api.notifications.NotificationDispatcher;
import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WishlistAlertEventRecorderTests {

    @Test
    void savesTargetReachedEventBeforeDispatchingNotification() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher);

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));

        ArgumentCaptor<WishlistAlertEvent> eventCaptor =
                ArgumentCaptor.forClass(WishlistAlertEvent.class);
        ArgumentCaptor<AlertNotificationRequest> requestCaptor =
                ArgumentCaptor.forClass(AlertNotificationRequest.class);
        InOrder inOrder = inOrder(repository, dispatcher);
        inOrder.verify(repository).saveAndFlush(eventCaptor.capture());
        inOrder.verify(dispatcher).dispatchTargetReached(requestCaptor.capture());

        WishlistAlertEvent event = eventCaptor.getValue();
        AlertNotificationRequest request = requestCaptor.getValue();
        assertAll(
                () -> assertEquals(7L, event.getUserId()),
                () -> assertEquals(42L, event.getWishlistItemId()),
                () -> assertEquals("$19.99", event.getCurrentPrice()),
                () -> assertEquals("$20.00", event.getTargetPrice()),
                () -> assertEquals("target-reached", event.getEvaluationState()),
                () -> assertEquals(true, event.isTargetReached()),
                () -> assertEquals(7L, request.userId()),
                () -> assertEquals(42L, request.wishlistItemId()),
                () -> assertEquals("New Game", request.itemTitle()),
                () -> assertEquals("Steam", request.store()),
                () -> assertEquals("$19.99", request.currentPrice()),
                () -> assertEquals("$20.00", request.targetPrice()),
                () -> assertEquals("target-reached", request.evaluationState()),
                () -> assertEquals("Target price reached.", request.message())
        );
    }

    @Test
    void nonTargetReachedEvaluationDoesNotSaveOrDispatch() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher);

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        false, "watching", "Still above target price."));

        verifyNoInteractions(repository, dispatcher);
    }

    @Test
    void dispatcherFailureDoesNotEscapeAfterEventIsSaved() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        doThrow(new IllegalStateException("dispatcher unavailable"))
                .when(dispatcher).dispatchTargetReached(any());
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher);

        assertDoesNotThrow(() -> recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached.")));

        verify(repository).saveAndFlush(any());
        verify(dispatcher).dispatchTargetReached(any());
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
