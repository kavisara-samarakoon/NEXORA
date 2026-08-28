package com.nexora.api.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(RequestCorrelationFilter.class);

    public static final String HEADER_NAME = "X-NEXORA-Request-ID";
    public static final String MDC_KEY = "nexora.request_id";
    public static final String REQUEST_ATTRIBUTE_KEY = "nexora.request_id";

    private static final Pattern SAFE_REQUEST_ID =
            Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(HEADER_NAME));

        request.setAttribute(REQUEST_ATTRIBUTE_KEY, requestId);
        response.setHeader(HEADER_NAME, requestId);
        MDC.put(MDC_KEY, requestId);
        long startNanos = System.nanoTime();

        try {
            filterChain.doFilter(request, response);
        } finally {
            try {
                LOGGER.info(
                        "API request completed method={} path={} status={} durationMs={}",
                        request.getMethod(),
                        request.getRequestURI(),
                        response.getStatus(),
                        elapsedMillis(startNanos));
            } finally {
                MDC.remove(MDC_KEY);
            }
        }
    }

    private static long elapsedMillis(long startNanos) {
        long elapsedNanos = System.nanoTime() - startNanos;
        return Math.max(0L, TimeUnit.NANOSECONDS.toMillis(elapsedNanos));
    }

    private static String resolveRequestId(String suppliedRequestId) {
        if (suppliedRequestId != null) {
            String candidate = suppliedRequestId.trim();
            if (SAFE_REQUEST_ID.matcher(candidate).matches()) {
                return candidate;
            }
        }
        return UUID.randomUUID().toString();
    }
}
