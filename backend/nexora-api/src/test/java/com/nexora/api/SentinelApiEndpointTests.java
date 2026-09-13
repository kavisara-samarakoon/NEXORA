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
    void sentinelStatusEndpointReturnsLocalGuidanceStatus() throws Exception {
        mockMvc.perform(get("/api/sentinel/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiStatus").value("Local NEXORA guidance"))
                .andExpect(jsonPath("$.backend").value("Connected"))
                .andExpect(jsonPath("$.geminiApi").value("External provider optional"))
                .andExpect(jsonPath("$.privacy").value("No chat history saved"));
    }

    @Test
    void sentinelDemoEndpointReturnsHonestAssistantData() throws Exception {
        mockMvc.perform(get("/api/sentinel/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages.length()").value(0))
                .andExpect(jsonPath("$.suggestions.length()").value(5))
                .andExpect(jsonPath("$.suggestions[0]").value("Find co-op games under $15"))
                .andExpect(jsonPath("$.capabilities.length()").value(4))
                .andExpect(jsonPath("$.systemStatus.length()").value(4))
                .andExpect(jsonPath("$.systemStatus[0].label").value("Assistant"))
                .andExpect(jsonPath("$.systemStatus[0].value").value("Local NEXORA guidance"))
                .andExpect(jsonPath("$.systemStatus[1].label").value("Backend"))
                .andExpect(jsonPath("$.systemStatus[1].value").value("Authenticated insight endpoint"))
                .andExpect(jsonPath("$.systemStatus[1].badge").value("API"))
                .andExpect(jsonPath("$.systemStatus[2].label").value("Provider"))
                .andExpect(jsonPath("$.systemStatus[2].value").value("Local by default, external optional"))
                .andExpect(jsonPath("$.systemStatus[2].badge").value("Optional"))
                .andExpect(jsonPath("$.systemStatus[3].value").value("No chat history saved"));
    }
}
