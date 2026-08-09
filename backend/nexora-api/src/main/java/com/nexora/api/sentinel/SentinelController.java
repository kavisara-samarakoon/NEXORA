package com.nexora.api.sentinel;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sentinel")
public class SentinelController {

    private final SentinelService sentinelService;

    public SentinelController(SentinelService sentinelService) {
        this.sentinelService = sentinelService;
    }

    @GetMapping("/status")
    public SentinelStatusResponse getStatus() {
        return sentinelService.getStatus();
    }

    @GetMapping("/demo")
    public SentinelDemoResponse getDemo() {
        return sentinelService.getDemo();
    }
}

