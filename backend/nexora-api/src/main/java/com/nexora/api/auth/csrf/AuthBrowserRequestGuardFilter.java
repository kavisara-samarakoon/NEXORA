package com.nexora.api.auth.csrf;

import com.nexora.api.auth.AuthErrorResponse;
import com.nexora.api.auth.AuthRateLimitErrorResponse;
import com.nexora.api.auth.abuse.AuthRateLimitExceededException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthBrowserRequestGuardFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout");

    private final AuthBrowserRequestGuard guard;
    private final ObjectMapper objectMapper;

    public AuthBrowserRequestGuardFilter(AuthBrowserRequestGuard guard, ObjectMapper objectMapper) {
        this.guard = guard;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return !"POST".equalsIgnoreCase(request.getMethod())
                || !PROTECTED_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            guard.validateOrigin(request);
            filterChain.doFilter(request, response);
        } catch (AuthRequestProtectionException exception) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Cache-Control", "no-store");
            objectMapper.writeValue(
                    response.getOutputStream(),
                    new AuthErrorResponse("csrf_failed", exception.getMessage()));
        } catch (AuthRateLimitExceededException exception) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Cache-Control", "no-store");
            response.setHeader("Retry-After", Long.toString(exception.retryAfterSeconds()));
            objectMapper.writeValue(
                    response.getOutputStream(),
                    new AuthRateLimitErrorResponse(
                            "rate_limited",
                            exception.getMessage(),
                            exception.retryAfterSeconds()));
        }
    }
}
