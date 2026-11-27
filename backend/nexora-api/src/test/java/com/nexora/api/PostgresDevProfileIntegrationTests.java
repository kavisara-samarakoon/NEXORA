package com.nexora.api;

import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.auth.events.AuthSecurityEventStore;
import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.wishlist.AddWishlistItemRequest;
import com.nexora.api.wishlist.UserWishlistService;
import com.nexora.api.wishlist.WishlistPriceHistoryPoint;
import com.nexora.api.wishlist.WishlistAlertEventResponse;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("dev")
@EnabledIfEnvironmentVariable(named = "NEXORA_POSTGRES_INTEGRATION_TESTS", matches = "(?i)true")
class PostgresDevProfileIntegrationTests {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private Environment environment;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AuthSecurityEventService authSecurityEventService;

    @Autowired
    private AuthSecurityEventStore authSecurityEventStore;

    @Autowired
    private UserWishlistService wishlist;

    @MockitoBean
    private CheapSharkDealClient cheapShark;

    @Test
    void postgresPersistsFirstVerifiedPriceAndEventSeparatelyFromIdenticalManualValues() {
        long userId = jdbcTemplate.queryForObject("""
                insert into users (email, username, password_hash, display_name)
                values ('price-fixture@example.invalid', 'price-fixture', 'test-fixture', 'Price Fixture')
                returning id
                """, Long.class);
        var item = wishlist.addWishlistItem(userId, new AddWishlistItemRequest(
                "Price Fixture", "Steam", "$8.00", "$10.00", null, null, null,
                true, null, "123", "deal-id", "USD", null));
        when(cheapShark.getStores()).thenReturn(List.of(new CheapSharkStoreResponse("1", "Steam", 1)));
        when(cheapShark.getDeals(12, "Price Fixture", null)).thenReturn(List.of(new CheapSharkDealResponse(
                "Price Fixture", "1", "8.00", "10.00", "0", "95", "9.0", "deal-id",
                "123", null, null, "90", 1700000200L)));

        var result = wishlist.refreshWishlistPrices(userId);
        assertEquals(1, result.observationsRecorded());
        assertEquals(1, result.targetReachedEventsCreated());
        assertEquals(List.of("wishlist-create", "cheapshark-refresh"),
                wishlist.getWishlistPriceHistory(userId, item.id(), 10).stream()
                        .map(WishlistPriceHistoryPoint::source).toList());
        assertEquals(List.of("cheapshark-refresh", "wishlist-create"),
                wishlist.getWishlistAlertEvents(userId).stream()
                        .map(WishlistAlertEventResponse::observationSource).toList());

        var repeat = wishlist.refreshWishlistPrices(userId);
        assertEquals(0, repeat.observationsRecorded());
        assertEquals(0, repeat.targetReachedEventsCreated());
    }

    @Test
    @Transactional
    void devProfileConnectsRunsAllMigrationsAndValidatesTheSchema() throws SQLException {
        assertTrue(Arrays.asList(environment.getActiveProfiles()).contains("dev"));

        try (Connection connection = dataSource.getConnection()) {
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());
        }

        Long successfulMigrations = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version is not null
                  and success = true
                """, Long.class);
        assertEquals(13L, successfulMigrations);

        String latestMigrationVersion = jdbcTemplate.queryForObject("""
                select version
                from flyway_schema_history
                where version is not null
                  and success = true
                order by installed_rank desc
                limit 1
                """, String.class);
        assertEquals("13", latestMigrationVersion);

        Integer requiredTableCount = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                      'users',
                      'wishlist_items',
                      'wishlist_alert_events',
                      'auth_sessions',
                      'auth_security_events',
                      'wishlist_price_history',
                      'notification_preferences'
                  )
                """, Integer.class);
        assertEquals(7, requiredTableCount);

        Integer unsafeEventColumnCount = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'auth_security_events'
                  and column_name in (
                      'password',
                      'email',
                      'username',
                      'login_identifier',
                      'access_token',
                      'refresh_token',
                      'token_hash',
                      'csrf_token',
                      'cookie',
                      'ip_address',
                      'user_agent'
                  )
                """, Integer.class);
        assertEquals(0, unsafeEventColumnCount);

        Long securityEventsBefore = jdbcTemplate.queryForObject(
                "select count(*) from auth_security_events",
                Long.class);
        authSecurityEventService.recordLoginFailure(AuthSecurityEventReasonCode.INVALID_CREDENTIALS);
        Long securityEventsAfter = jdbcTemplate.queryForObject(
                "select count(*) from auth_security_events",
                Long.class);
        assertEquals(securityEventsBefore + 1, securityEventsAfter);

        Integer safeFailureRows = jdbcTemplate.queryForObject("""
                select count(*)
                from auth_security_events
                where event_type = 'LOGIN_FAILURE'
                  and outcome = 'FAILURE'
                  and reason_code = 'invalid_credentials'
                  and source = 'auth'
                  and user_id is null
                """, Integer.class);
        assertTrue(safeFailureRows != null && safeFailureRows > 0);

        LocalDateTime oldEventTime = LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime retainedEventTime = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime cleanupCutoff = LocalDateTime.of(2000, 1, 1, 0, 0);
        Integer eligibleRowsBefore = jdbcTemplate.queryForObject(
                "select count(*) from auth_security_events where occurred_at < ?",
                Integer.class,
                cleanupCutoff);
        jdbcTemplate.update("""
                insert into auth_security_events (
                    event_type, outcome, user_id, reason_code, source, occurred_at, created_at
                ) values ('LOGIN_FAILURE', 'FAILURE', null, 'invalid_credentials', 'auth', ?, ?)
                """, oldEventTime, oldEventTime);
        jdbcTemplate.update("""
                insert into auth_security_events (
                    event_type, outcome, user_id, reason_code, source, occurred_at, created_at
                ) values ('LOGIN_SUCCESS', 'SUCCESS', null, null, 'auth', ?, ?)
                """, retainedEventTime, retainedEventTime);

        assertEquals(eligibleRowsBefore + 1, authSecurityEventStore.deleteOlderThan(cleanupCutoff));
        Integer retainedCleanupRows = jdbcTemplate.queryForObject(
                "select count(*) from auth_security_events where occurred_at = ?",
                Integer.class,
                retainedEventTime);
        assertEquals(1, retainedCleanupRows);

        Long seededDeals = jdbcTemplate.queryForObject(
                "select count(*) from deals where is_active = true",
                Long.class
        );
        assertTrue(seededDeals != null && seededDeals > 0);
    }
}
