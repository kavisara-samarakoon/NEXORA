package com.nexora.api.config;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Locale;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("hosted-demo")
@EnabledIfEnvironmentVariable(
        named = "NEXORA_RUN_HOSTED_POSTGRES_VALIDATION",
        matches = "(?i)true")
class HostedPostgresPersistenceValidationTests {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private Environment environment;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void hostedDemoConnectsToExternalPostgresWithCurrentFlywaySchema() throws SQLException {
        assertTrue(Arrays.asList(environment.getActiveProfiles())
                .containsAll(Arrays.asList("hosted-demo", "dev", "production")));

        try (Connection connection = dataSource.getConnection()) {
            assertTrue(connection.isValid(5));
            assertEquals("PostgreSQL", connection.getMetaData().getDatabaseProductName());

            String jdbcUrl = connection.getMetaData().getURL().toLowerCase(Locale.ROOT);
            assertTrue(jdbcUrl.startsWith("jdbc:postgresql://"));
            assertFalse(jdbcUrl.contains("//localhost"));
            assertFalse(jdbcUrl.contains("//127.0.0.1"));
            assertFalse(jdbcUrl.contains("//[::1]"));
        }

        assertEquals(1, jdbcTemplate.queryForObject("select 1", Integer.class));

        String flywayHistoryTable = jdbcTemplate.queryForObject(
                "select to_regclass('public.flyway_schema_history')::text",
                String.class);
        assertNotNull(flywayHistoryTable);

        Long successfulMigrations = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version is not null
                  and success = true
                """, Long.class);
        assertEquals(12L, successfulMigrations,
                "Hosted schema must contain exactly 12 successful versioned migrations");

        String latestMigrationVersion = jdbcTemplate.queryForObject("""
                select version
                from flyway_schema_history
                where version is not null
                  and success = true
                order by installed_rank desc
                limit 1
                """, String.class);
        assertEquals("12", latestMigrationVersion,
                "Hosted schema must be at Flyway version 12");

        Long failedMigrations = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where success = false
                """, Long.class);
        assertEquals(0L, failedMigrations);
    }
}
