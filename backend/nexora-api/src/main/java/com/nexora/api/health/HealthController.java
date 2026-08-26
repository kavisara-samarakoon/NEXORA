package com.nexora.api.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final RuntimeHealthService runtimeHealthService;

    public HealthController(RuntimeHealthService runtimeHealthService) {
        this.runtimeHealthService = runtimeHealthService;
    }

    @GetMapping
    public HealthResponse health() {
        return runtimeHealthService.getHealth();
    }
}
