package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SentinelApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void sentinelStatusEndpointReturnsGatewayFoundationStatus() throws Exception {
        mockMvc.perform(get("/api/sentinel/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiStatus").value("Gateway Foundation"))
                .andExpect(jsonPath("$.backend").value("Connected"))
                .andExpect(jsonPath("$.geminiApi").value("Gemini Disabled"))
                .andExpect(jsonPath("$.privacy").value("No messages saved"));
    }

    @Test
    void sentinelDemoEndpointReturnsPageDemoData() throws Exception {
        mockMvc.perform(get("/api/sentinel/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages.length()").value(4))
                .andExpect(jsonPath("$.messages[0].role").value("user"))
                .andExpect(jsonPath("$.messages[1].segments[1].emphasis").value(true))
                .andExpect(jsonPath("$.suggestions.length()").value(5))
                .andExpect(jsonPath("$.capabilities.length()").value(4))
                .andExpect(jsonPath("$.systemStatus.length()").value(4))
                .andExpect(jsonPath("$.systemStatus[1].value").value("Connected"))
                .andExpect(jsonPath("$.systemStatus[2].label").value("Provider"))
                .andExpect(jsonPath("$.systemStatus[2].value")
                        .value("Local Preview / Gemini Disabled"));
    }
}
