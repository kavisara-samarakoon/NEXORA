package com.nexora.api;

import com.nexora.api.notifications.LogNotificationSender;
import com.nexora.api.notifications.NotificationProperties;
import com.nexora.api.notifications.NotificationSender;
import com.nexora.api.wishlist.StoredWishlistPriceSnapshotProvider;
import com.nexora.api.wishlist.WishlistPriceRefreshScheduler;
import com.nexora.api.wishlist.WishlistPriceSnapshotProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NexoraApiApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WishlistPriceSnapshotProvider wishlistPriceSnapshotProvider;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private NotificationProperties notificationProperties;

    @Autowired
    private List<NotificationSender> notificationSenders;

    @Test
    void notificationsAreDisabledWithOneLogSenderByDefault() {
        assertFalse(notificationProperties.isEnabled());
        assertEquals(1, notificationSenders.size());
        assertInstanceOf(LogNotificationSender.class, notificationSenders.get(0));
    }

    @Test
    void storedWishlistPriceProviderIsTheSafeDefaultAndSchedulerIsDisabled() {
        assertInstanceOf(
                StoredWishlistPriceSnapshotProvider.class,
                wishlistPriceSnapshotProvider
        );
        assertTrue(applicationContext.getBeansOfType(
                WishlistPriceRefreshScheduler.class).isEmpty());
    }

    @Test
    void healthEndpointReturnsServiceStatus() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("NEXORA API"));
    }

    @Test
    void welcomeEndpointReturnsBackendDetails() throws Exception {
        mockMvc.perform(get("/api"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Welcome to NEXORA API"))
                .andExpect(jsonPath("$.frontend").value("Next.js"))
                .andExpect(jsonPath("$.status").value("Backend foundation ready"));
    }

    @Test
    void corsAllowsNextJsDevelopmentOrigin() throws Exception {
        mockMvc.perform(options("/api/health")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void corsAllowsViteDevelopmentOrigin() throws Exception {
        mockMvc.perform(options("/api/health")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
