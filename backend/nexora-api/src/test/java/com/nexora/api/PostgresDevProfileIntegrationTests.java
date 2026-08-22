package com.nexora.api;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

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

    @Test
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
        assertEquals(8L, successfulMigrations);

        Integer requiredTableCount = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                      'users',
                      'wishlist_items',
                      'wishlist_alert_events',
                      'auth_sessions',
                      'wishlist_price_history'
                  )
                """, Integer.class);
        assertEquals(5, requiredTableCount);

        Long seededDeals = jdbcTemplate.queryForObject(
                "select count(*) from deals where is_active = true",
                Long.class
        );
        assertTrue(seededDeals != null && seededDeals > 0);
    }
}
