package com.nexora.api;

import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.auth.events.AuthSecurityEventStore;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Arrays;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
        assertEquals(12L, successfulMigrations);

        String latestMigrationVersion = jdbcTemplate.queryForObject("""
                select version
                from flyway_schema_history
                where version is not null
                  and success = true
                order by installed_rank desc
                limit 1
                """, String.class);
        assertEquals("12", latestMigrationVersion);

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
