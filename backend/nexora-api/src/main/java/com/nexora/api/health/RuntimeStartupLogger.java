package com.nexora.api.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class RuntimeStartupLogger implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger LOGGER = LoggerFactory.getLogger(RuntimeStartupLogger.class);

    private final RuntimeHealthService runtimeHealthService;

    public RuntimeStartupLogger(RuntimeHealthService runtimeHealthService) {
        this.runtimeHealthService = runtimeHealthService;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        LOGGER.info("{}", startupSummary(runtimeHealthService.getHealth()));
    }

    public static String startupSummary(HealthResponse health) {
        return String.format(
                Locale.ROOT,
                "Runtime ready service=%s milestone=%s profiles=%s runtimeMode=%s dataMode=%s "
                        + "sentinelProvider=%s notificationProvider=%s priceRefreshProvider=%s "
                        + "authProductionGuard=%s",
                health.service(),
                health.milestone(),
                health.activeProfiles(),
                health.runtimeMode(),
                health.dataMode(),
                health.sentinelProvider(),
                health.notificationProvider(),
                health.priceRefreshProvider(),
                health.checks().get("authProductionGuard"));
    }
}
