package com.nexora.api.deals;

import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Component
public class CheapSharkDealClient {

    private static final String USER_AGENT = "NEXORA/0.1 (external-deals-foundation)";

    private final ExternalDealsProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public CheapSharkDealClient(ExternalDealsProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                .build();
    }

    public List<CheapSharkDealResponse> getDeals(
            int pageSize,
            String title,
            BigDecimal upperPrice) {
        HttpRequest request = HttpRequest.newBuilder(buildDealsUri(pageSize, title, upperPrice))
                .timeout(properties.timeout())
                .header("Accept", "application/json")
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new CheapSharkClientException(
                        "CheapShark returned HTTP " + response.statusCode()
                );
            }

            CheapSharkDealResponse[] deals = objectMapper.readValue(
                    response.body(),
                    CheapSharkDealResponse[].class
            );
            if (deals == null) {
                throw new CheapSharkClientException("CheapShark returned an empty response body");
            }
            return Arrays.asList(deals);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new CheapSharkClientException("CheapShark request was interrupted", exception);
        } catch (IOException | JacksonException exception) {
            throw new CheapSharkClientException("CheapShark request failed", exception);
        }
    }

    private URI buildDealsUri(int pageSize, String title, BigDecimal upperPrice) {
        StringBuilder uri = new StringBuilder(normalizedBaseUrl())
                .append("/deals?pageSize=").append(pageSize)
                .append("&pageNumber=0")
                .append("&sortBy=DealRating")
                .append("&desc=1")
                .append("&onSale=1");

        if (title != null) {
            uri.append("&title=").append(encode(title));
        }
        if (upperPrice != null) {
            uri.append("&upperPrice=").append(encode(upperPrice.stripTrailingZeros().toPlainString()));
        }

        return URI.create(uri.toString());
    }

    private String normalizedBaseUrl() {
        String baseUrl = properties.getCheapshark().getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new CheapSharkClientException("CheapShark base URL is not configured");
        }
        return baseUrl.replaceAll("/+$", "");
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
