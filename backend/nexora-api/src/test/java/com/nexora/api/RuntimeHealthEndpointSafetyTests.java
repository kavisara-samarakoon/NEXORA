package com.nexora.api;

import com.nexora.api.health.RuntimeHealthService;
import com.nexora.api.health.RuntimeStartupLogger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RuntimeHealthEndpointSafetyTests {

    static final String JWT_MARKER =
            "runtime-endpoint-jwt-material-that-must-never-be-returned";
    static final String REFRESH_MARKER =
            "runtime-endpoint-refresh-material-that-must-never-be-returned";
    static final String COOKIE_MARKER = "runtime_sensitive_cookie";
    static final String DB_URL_MARKER =
            "jdbc:postgresql://private-runtime-db.internal:5432/nexora";
    static final String DB_USER_MARKER = "runtime_private_database_user";
    static final String DB_PASS_MARKER = "runtime-private-database-credential";
    static final String GEMINI_MARKER = "runtime-private-gemini-credential";
    static final String SMTP_MARKER = "runtime-private-smtp-credential";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RuntimeHealthService runtimeHealthService;

    @DynamicPropertySource
    static void sensitiveTestProperties(DynamicPropertyRegistry registry) {
        registry.add("nexora.auth.jwt-secret", () -> JWT_MARKER);
        registry.add("nexora.auth.refresh-token-hash-secret", () -> REFRESH_MARKER);
        registry.add("nexora.auth.refresh-token-cookie-name", () -> COOKIE_MARKER);
        registry.add("spring.datasource.url", () -> DB_URL_MARKER);
        registry.add("spring.datasource.username", () -> DB_USER_MARKER);
        registry.add("spring.datasource.password", () -> DB_PASS_MARKER);
        registry.add("nexora.sentinel.ai.provider", () -> "gemini");
        registry.add("nexora.sentinel.ai.gemini.api-key", () -> GEMINI_MARKER);
        registry.add("spring.mail.password", () -> SMTP_MARKER);
    }

    @Test
    void healthEndpointReturnsSafeRuntimeFieldsWithoutSensitiveConfiguration() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("NEXORA API"))
                .andExpect(jsonPath("$.runtimeMode").value("local-demo"))
                .andExpect(jsonPath("$.dataMode").value("in-memory-demo"))
                .andExpect(jsonPath("$.sentinelProvider").value("gemini"))
                .andExpect(jsonPath("$.checks.authProductionGuard").value("inactive"))
                .andReturn();

        assertSensitiveValuesAbsent(result.getResponse().getContentAsString());
    }

    @Test
    void startupSummaryDoesNotContainSensitiveConfiguration() {
        assertSensitiveValuesAbsent(
                RuntimeStartupLogger.startupSummary(runtimeHealthService.getHealth()));
    }

    private static void assertSensitiveValuesAbsent(String value) {
        List.of(
                        JWT_MARKER,
                        REFRESH_MARKER,
                        COOKIE_MARKER,
                        DB_URL_MARKER,
                        DB_USER_MARKER,
                        DB_PASS_MARKER,
                        GEMINI_MARKER,
                        SMTP_MARKER)
                .forEach(sensitiveValue -> assertFalse(value.contains(sensitiveValue)));
    }
}
