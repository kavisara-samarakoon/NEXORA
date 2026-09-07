package com.nexora.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DefaultDenyRoutePolicySecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void representativeIntendedGetRoutesRemainPublic() throws Exception {
        for (String publicRoute : List.of(
                "/api",
                "/api/health",
                "/api/deals",
                "/api/giveaways",
                "/api/wishlist",
                "/api/dashboard/summary",
                "/api/security/status",
                "/api/sentinel/status",
                "/api/sentinel/demo")) {
            mockMvc.perform(get(publicRoute))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void csrfTokenRouteRemainsPublic() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk());
    }

    @Test
    void existingAccountScopedRoutesRemainProtected() throws Exception {
        expectAuthenticationDenial(mockMvc.perform(get("/api/auth/me")));
        expectAuthenticationDenial(mockMvc.perform(get("/api/me/wishlist")));
        expectAuthenticationDenial(mockMvc.perform(get("/api/me/notification-preferences")));
        expectAuthenticationDenial(mockMvc.perform(post("/api/me/sentinel/insight")));
    }

    @Test
    void unknownApiRouteIsDeniedByDefault() throws Exception {
        expectAuthenticationDenial(mockMvc.perform(get("/api/future-unmatched-route")));
    }

    @Test
    void unlistedSubpathDoesNotInheritPublicAccess() throws Exception {
        expectAuthenticationDenial(mockMvc.perform(get("/api/deals/future-unmatched-route")));
    }

    @Test
    void unexpectedMethodAgainstPublicRouteIsDenied() throws Exception {
        expectAuthenticationDenial(mockMvc.perform(post("/api/health")));
    }

    private static void expectAuthenticationDenial(ResultActions result) throws Exception {
        result.andExpect(mvcResult -> {
            int responseStatus = mvcResult.getResponse().getStatus();
            assertTrue(
                    responseStatus == 401 || responseStatus == 403,
                    () -> "Expected authentication denial (401 or 403), but received " + responseStatus);
        });
    }
}
