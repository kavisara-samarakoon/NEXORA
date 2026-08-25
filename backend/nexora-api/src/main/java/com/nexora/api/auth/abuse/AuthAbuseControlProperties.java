package com.nexora.api.auth.abuse;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "nexora.auth.abuse-controls")
public class AuthAbuseControlProperties {

    static final int MIN_WINDOW_SECONDS = 1;
    static final int MAX_WINDOW_SECONDS = 3_600;
    static final int MIN_MAX_ATTEMPTS = 1;
    static final int MAX_MAX_ATTEMPTS = 10_000;

    private boolean enabled = true;
    private int windowSeconds = 60;
    private int registerMaxAttempts = 10;
    private int loginMaxAttempts = 20;
    private int refreshMaxAttempts = 30;
    private int logoutMaxAttempts = 30;
    private int rejectionMaxAttempts = 30;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getWindowSeconds() {
        return windowSeconds;
    }

    public void setWindowSeconds(int windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    public int getRegisterMaxAttempts() {
        return registerMaxAttempts;
    }

    public void setRegisterMaxAttempts(int registerMaxAttempts) {
        this.registerMaxAttempts = registerMaxAttempts;
    }

    public int getLoginMaxAttempts() {
        return loginMaxAttempts;
    }

    public void setLoginMaxAttempts(int loginMaxAttempts) {
        this.loginMaxAttempts = loginMaxAttempts;
    }

    public int getRefreshMaxAttempts() {
        return refreshMaxAttempts;
    }

    public void setRefreshMaxAttempts(int refreshMaxAttempts) {
        this.refreshMaxAttempts = refreshMaxAttempts;
    }

    public int getLogoutMaxAttempts() {
        return logoutMaxAttempts;
    }

    public void setLogoutMaxAttempts(int logoutMaxAttempts) {
        this.logoutMaxAttempts = logoutMaxAttempts;
    }

    public int getRejectionMaxAttempts() {
        return rejectionMaxAttempts;
    }

    public void setRejectionMaxAttempts(int rejectionMaxAttempts) {
        this.rejectionMaxAttempts = rejectionMaxAttempts;
    }

    public int boundedWindowSeconds() {
        return bound(windowSeconds, MIN_WINDOW_SECONDS, MAX_WINDOW_SECONDS);
    }

    public int boundedMaxAttempts(AuthAbuseLimit limit) {
        int configured = switch (limit) {
            case REGISTER -> registerMaxAttempts;
            case LOGIN -> loginMaxAttempts;
            case REFRESH -> refreshMaxAttempts;
            case LOGOUT -> logoutMaxAttempts;
            case CSRF_ORIGIN_REJECTION -> rejectionMaxAttempts;
        };
        return bound(configured, MIN_MAX_ATTEMPTS, MAX_MAX_ATTEMPTS);
    }

    private static int bound(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }
}
