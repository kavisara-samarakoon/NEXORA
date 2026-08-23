package com.nexora.api.sentinel.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class GeminiSentinelClient {

    static final int MAX_ANSWER_CHARACTERS = 4_000;
    private static final String SYSTEM_INSTRUCTION = """
            You are NEXORA Sentinel. Return concise guidance only. Never claim that you made a
            purchase or changed wishlist, deal, account, notification, or security data. Never ask
            for passwords, OTPs, API keys, card numbers, or other secrets. Do not provide malicious
            cybersecurity instructions. Recommend checking official store pages before purchases.
            Wishlist and deal mutation are unavailable. NEXORA does not persist this conversation.
            """;

    private final SentinelAiProperties properties;
    private final ObjectMapper objectMapper;
    private final GeminiRequestSender requestSender;

    @Autowired
    public GeminiSentinelClient(
            SentinelAiProperties properties,
            ObjectMapper objectMapper) {
        this(properties, objectMapper, createRequestSender(properties));
    }

    GeminiSentinelClient(
            SentinelAiProperties properties,
            ObjectMapper objectMapper,
            GeminiRequestSender requestSender) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.requestSender = requestSender;
    }

    public String generateText(SentinelGatewayInput input) {
        SentinelAiProperties.Gemini gemini = properties.getGemini();
        validateConfiguration(gemini);

        GeminiGenerateContentRequest payload = new GeminiGenerateContentRequest(
                new GeminiContent(List.of(new GeminiPart(SYSTEM_INSTRUCTION))),
                List.of(new GeminiContent(List.of(new GeminiPart(userPrompt(input))))),
                new GeminiGenerationConfig(
                        gemini.boundedMaxOutputTokens(),
                        gemini.boundedTemperature()),
                false);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder(generateContentUri(gemini))
                    .timeout(gemini.timeout())
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", gemini.normalizedApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            GeminiHttpResponse response = requestSender.send(request);

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new GeminiClientException("Gemini provider returned a non-success status");
            }
            return extractAnswer(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new GeminiClientException("Gemini provider request was interrupted", exception);
        } catch (IOException | JacksonException exception) {
            throw new GeminiClientException("Gemini provider request failed", exception);
        } catch (IllegalArgumentException exception) {
            throw new GeminiClientException("Gemini provider configuration is invalid", exception);
        }
    }

    private String extractAnswer(String responseBody) throws JacksonException {
        JsonNode response = objectMapper.readTree(responseBody);
        if (response == null || response.isNull()) {
            throw new GeminiClientException("Gemini provider returned no usable answer");
        }

        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.size() == 0) {
            throw new GeminiClientException("Gemini provider returned no usable answer");
        }

        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray()) {
            throw new GeminiClientException("Gemini provider returned no usable answer");
        }

        StringBuilder answer = new StringBuilder();
        for (JsonNode part : parts) {
            JsonNode text = part.path("text");
            if (text.isString() && !text.stringValue().isBlank()) {
                if (!answer.isEmpty()) {
                    answer.append('\n');
                }
                answer.append(text.stringValue().trim());
            }
        }

        String normalized = answer.toString().trim();
        if (normalized.isEmpty()) {
            throw new GeminiClientException("Gemini provider returned no usable answer");
        }
        if (normalized.length() > MAX_ANSWER_CHARACTERS) {
            return normalized.substring(0, MAX_ANSWER_CHARACTERS).trim();
        }
        return normalized;
    }

    private static String userPrompt(SentinelGatewayInput input) {
        return """
                Context: %s
                Product constraints: guidance only; no autonomous actions; verify current source data.
                User message:
                <user_message>
                %s
                </user_message>
                Respond with a short plain-text answer. Do not return JSON or markdown sections.
                """.formatted(input.context().apiValue(), input.message());
    }

    private static URI generateContentUri(SentinelAiProperties.Gemini gemini) {
        return URI.create(gemini.normalizedBaseUrl()
                + "/models/"
                + gemini.normalizedModel()
                + ":generateContent");
    }

    private static void validateConfiguration(SentinelAiProperties.Gemini gemini) {
        if (gemini.normalizedApiKey().isEmpty()
                || gemini.normalizedBaseUrl().isEmpty()
                || !gemini.normalizedModel().matches("[A-Za-z0-9._-]+")) {
            throw new GeminiClientException("Gemini provider is not configured");
        }
    }

    private static GeminiRequestSender createRequestSender(SentinelAiProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.getGemini().timeout())
                .build();
        return request -> {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return new GeminiHttpResponse(response.statusCode(), response.body());
        };
    }

    @FunctionalInterface
    interface GeminiRequestSender {
        GeminiHttpResponse send(HttpRequest request) throws IOException, InterruptedException;
    }

    record GeminiHttpResponse(int statusCode, String body) {
    }

    private record GeminiGenerateContentRequest(
            GeminiContent systemInstruction,
            List<GeminiContent> contents,
            GeminiGenerationConfig generationConfig,
            boolean store) {
    }

    private record GeminiContent(List<GeminiPart> parts) {
    }

    private record GeminiPart(String text) {
    }

    private record GeminiGenerationConfig(int maxOutputTokens, double temperature) {
    }
}
