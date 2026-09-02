package com.nexora.api.wishlist;

import com.nexora.api.notifications.AlertNotificationRequest;
import com.nexora.api.notifications.EmailNotificationSender;
import com.nexora.api.notifications.NotificationDispatcher;
import com.nexora.api.notifications.NotificationProperties;
import com.nexora.api.notifications.NotificationSender;
import com.nexora.api.notifications.preferences.InMemoryUserNotificationPreferenceService;
import com.nexora.api.notifications.preferences.NotificationPreferenceResponse;
import com.nexora.api.notifications.preferences.UserNotificationPreferenceService;
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
        NotificationSender sender = mock(NotificationSender.class);
        NotificationDispatcher dispatcher = enabledDispatcher(sender);
        UserNotificationPreferenceService preferences = preferences(true, true);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher, preferences);

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));

        ArgumentCaptor<WishlistAlertEvent> eventCaptor =
                ArgumentCaptor.forClass(WishlistAlertEvent.class);
        ArgumentCaptor<AlertNotificationRequest> requestCaptor =
                ArgumentCaptor.forClass(AlertNotificationRequest.class);
        InOrder inOrder = inOrder(repository, preferences, sender);
        inOrder.verify(repository).saveAndFlush(eventCaptor.capture());
        inOrder.verify(preferences).getPreferences(7L);
        inOrder.verify(sender).send(requestCaptor.capture());

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
        UserNotificationPreferenceService preferences = mock(
                UserNotificationPreferenceService.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher, preferences);

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        false, "watching", "Still above target price."));

        verifyNoInteractions(repository, dispatcher, preferences);
    }

    @Test
    void emailDisabledStillSavesEventWithoutDispatching() {
        WishlistAlertEventRepository repository = savingRepository();
        NotificationSender sender = mock(NotificationSender.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository,
                enabledDispatcher(sender),
                preferences(false, true));

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));

        verify(repository).saveAndFlush(any());
        verifyNoInteractions(sender);
    }

    @Test
    void targetReachedDisabledStillSavesEventWithoutDispatching() {
        WishlistAlertEventRepository repository = savingRepository();
        NotificationSender sender = mock(NotificationSender.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository,
                enabledDispatcher(sender),
                preferences(true, false));

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));

        verify(repository).saveAndFlush(any());
        verifyNoInteractions(sender);
    }

    @Test
    void defaultPreferencesStillSaveEventAndSuppressEmailDispatch() {
        WishlistAlertEventRepository repository = savingRepository();
        NotificationSender sender = mock(NotificationSender.class);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository,
                enabledDispatcher(sender),
                new InMemoryUserNotificationPreferenceService());

        recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));

        verify(repository).saveAndFlush(any());
        verifyNoInteractions(sender);
    }

    @Test
    void dispatcherFailureDoesNotEscapeAfterEventIsSaved() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        NotificationDispatcher dispatcher = mock(NotificationDispatcher.class);
        UserNotificationPreferenceService preferences = preferences(true, true);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        doThrow(new IllegalStateException("dispatcher unavailable"))
                .when(dispatcher).dispatchTargetReached(any());
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher, preferences);

        assertDoesNotThrow(() -> recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached.")));

        verify(repository).saveAndFlush(any());
        verify(dispatcher).dispatchTargetReached(any());
    }

    @Test
    void emailSenderFailureDoesNotPreventEventSave() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        EmailNotificationSender emailSender = mock(EmailNotificationSender.class);
        doThrow(new IllegalStateException("SMTP unavailable")).when(emailSender).send(any());
        NotificationProperties properties = new NotificationProperties();
        properties.setEnabled(true);
        properties.setProvider("email");
        NotificationDispatcher dispatcher = new NotificationDispatcher(properties, emailSender);
        UserNotificationPreferenceService preferences = preferences(true, true);
        WishlistAlertEventRecorder recorder = new WishlistAlertEventRecorder(
                repository, dispatcher, preferences);

        assertDoesNotThrow(() -> recorder.recordTargetReachedEvent(
                7L,
                item(),
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached.")));

        InOrder inOrder = inOrder(repository, emailSender);
        inOrder.verify(repository).saveAndFlush(any());
        inOrder.verify(emailSender).send(any());
    }

    private static WishlistAlertEventRepository savingRepository() {
        WishlistAlertEventRepository repository = mock(WishlistAlertEventRepository.class);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return repository;
    }

    private static NotificationDispatcher enabledDispatcher(NotificationSender sender) {
        NotificationProperties properties = new NotificationProperties();
        properties.setEnabled(true);
        properties.setProvider("log");
        return new NotificationDispatcher(properties, sender);
    }

    private static UserNotificationPreferenceService preferences(
            boolean emailEnabled,
            boolean targetReachedEnabled) {
        UserNotificationPreferenceService service = mock(
                UserNotificationPreferenceService.class);
        when(service.getPreferences(7L)).thenReturn(new NotificationPreferenceResponse(
                emailEnabled,
                true,
                targetReachedEnabled,
                true,
                true));
        return service;
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
