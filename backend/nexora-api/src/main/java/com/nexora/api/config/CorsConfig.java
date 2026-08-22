package com.nexora.api.config;

import com.nexora.api.auth.csrf.AuthCsrfProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final AuthCsrfProperties authCsrfProperties;

    public CorsConfig(AuthCsrfProperties authCsrfProperties) {
        this.authCsrfProperties = authCsrfProperties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(authCsrfProperties.trustedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders(
                        HttpHeaders.CONTENT_TYPE,
                        HttpHeaders.AUTHORIZATION,
                        authCsrfProperties.headerName())
                .allowCredentials(true);
    }
}
