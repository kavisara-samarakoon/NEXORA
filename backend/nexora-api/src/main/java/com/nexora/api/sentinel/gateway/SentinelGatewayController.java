package com.nexora.api.sentinel.gateway;

import com.nexora.api.auth.AuthenticatedUserIdResolver;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/sentinel")
public class SentinelGatewayController {

    private final SentinelGatewayService gatewayService;
    private final AuthenticatedUserIdResolver userIdResolver;

    public SentinelGatewayController(
            SentinelGatewayService gatewayService,
            AuthenticatedUserIdResolver userIdResolver) {
        this.gatewayService = gatewayService;
        this.userIdResolver = userIdResolver;
    }

    @PostMapping("/insight")
    public SentinelInsightResponse requestInsight(
            Authentication authentication,
            @Valid @RequestBody SentinelInsightRequest request) {
        return gatewayService.requestInsight(
                userIdResolver.resolve(authentication), request);
    }
}
