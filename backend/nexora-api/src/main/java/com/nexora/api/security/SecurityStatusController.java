package com.nexora.api.security;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/security/status")
public class SecurityStatusController {

    private final SecurityStatusService securityStatusService;

    public SecurityStatusController(SecurityStatusService securityStatusService) {
        this.securityStatusService = securityStatusService;
    }

    @GetMapping
    public SecurityStatusResponse getSecurityStatus() {
        return securityStatusService.getSecurityStatus();
    }
}

