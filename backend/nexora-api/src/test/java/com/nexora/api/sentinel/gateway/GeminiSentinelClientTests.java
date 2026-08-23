package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpRequest;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GeminiSentinelClientTests {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void buildsBoundedGenerateContentRequestAndParsesText() throws Exception {
        SentinelAiProperties properties = properties();
        AtomicReference<HttpRequest> capturedRequest = new AtomicReference<>();
        GeminiSentinelClient client = new GeminiSentinelClient(
                properties,
                objectMapper,
                request -> {
                    capturedRequest.set(request);
                    return new GeminiSentinelClient.GeminiHttpResponse(
                            200,
                            "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"  Safe Gemini guidance.  \"}]}}]}");
                });

        SentinelContextSummary summary = new SentinelContextSummary(
                SentinelInsightContext.DEALS,
                0, 0, 0, 1, 0,
                java.util.List.of(),
                java.util.List.of(),
                java.util.List.of(new SentinelDealContext(
                        "Context Deal access_token=context-secret",
                        "Steam",
                        "$19.99",
                        "$59.99",
                        67,
                        "-67%",
                        "Great Deal",
                        "RPG")),
                java.util.List.of());
        String answer = client.generateText(new SentinelGatewayInput(
                7L,
                "  Should I buy this game now? password=user-secret  ",
                SentinelInsightContext.DEALS,
                summary));

        HttpRequest request = capturedRequest.get();
        String body = requestBody(request);
        JsonNode json = objectMapper.readTree(body);
        assertAll(
                () -> assertEquals("Safe Gemini guidance.", answer),
                () -> assertEquals(
                        "https://gemini.test/v1beta/models/test-model:generateContent",
                        request.uri().toString()),
                () -> assertEquals(Duration.ofMillis(1_234), request.timeout().orElseThrow()),
                () -> assertEquals(
                        "test-only-placeholder",
                        request.headers().firstValue("x-goog-api-key").orElseThrow()),
                () -> assertFalse(request.uri().toString().contains("test-only-placeholder")),
                () -> assertFalse(body.contains("test-only-placeholder")),
                () -> assertFalse(json.path("store").booleanValue()),
                () -> assertEquals(
                        333,
                        json.path("generationConfig").path("maxOutputTokens").intValue()),
                () -> assertEquals(
                        0.4,
                        json.path("generationConfig").path("temperature").doubleValue()),
                () -> assertTrue(body.contains("Should I buy this game now?")),
                () -> assertTrue(body.contains("Bounded NEXORA context summary")),
                () -> assertTrue(body.contains("Context Deal")),
                () -> assertTrue(body.contains("[redacted secret]")),
                () -> assertFalse(body.contains("context-secret")),
                () -> assertFalse(body.contains("user-secret")),
                () -> assertTrue(body.contains("NEXORA Sentinel"))
        );
    }

    @Test
    void emptyMalformedAndNonSuccessResponsesFailSafely() {
        SentinelGatewayInput input = new SentinelGatewayInput(
                7L, "Question", SentinelInsightContext.GENERAL);

        assertThrows(GeminiClientException.class, () -> clientReturning(200, "{}").generateText(input));
        assertThrows(GeminiClientException.class, () -> clientReturning(200, "null").generateText(input));
        assertThrows(GeminiClientException.class, () -> clientReturning(200, "not-json").generateText(input));
        assertThrows(GeminiClientException.class, () -> clientReturning(429, "rate limited").generateText(input));
    }

    private GeminiSentinelClient clientReturning(int status, String body) {
        return new GeminiSentinelClient(
                properties(),
                objectMapper,
                request -> new GeminiSentinelClient.GeminiHttpResponse(status, body));
    }

    private static SentinelAiProperties properties() {
        SentinelAiProperties properties = new SentinelAiProperties();
        properties.setProvider("gemini");
        properties.getGemini().setApiKey("test-only-placeholder");
        properties.getGemini().setBaseUrl("https://gemini.test/v1beta/");
        properties.getGemini().setModel("test-model");
        properties.getGemini().setTimeoutMs(1_234);
        properties.getGemini().setMaxOutputTokens(333);
        properties.getGemini().setTemperature(0.4);
        return properties;
    }

    private static String requestBody(HttpRequest request) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Flow.Subscriber<ByteBuffer> subscriber = new Flow.Subscriber<>() {
            @Override
            public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item) {
                byte[] chunk = new byte[item.remaining()];
                item.get(chunk);
                bytes.writeBytes(chunk);
            }

            @Override
            public void onError(Throwable throwable) {
                throw new AssertionError("Could not read request body", throwable);
            }

            @Override
            public void onComplete() {
            }
        };
        request.bodyPublisher().orElseThrow().subscribe(subscriber);
        return bytes.toString(StandardCharsets.UTF_8);
    }
}
