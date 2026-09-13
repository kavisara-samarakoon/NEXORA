package com.nexora.api.sentinel;

import com.nexora.api.sentinel.gateway.SentinelAiProperties;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SentinelService {

    private final SentinelAiProperties aiProperties;

    public SentinelService(SentinelAiProperties aiProperties) {
        this.aiProperties = aiProperties;
    }

    private static final List<SentinelMessage> MESSAGES = List.of();

    private static final List<String> SUGGESTIONS = List.of(
            "Find co-op games under $15",
            "Compare Elden Ring prices",
            "Show free games this week",
            "Help me set a wishlist alert",
            "Is my gaming account secure?"
    );

    private static final List<SentinelCapability> CAPABILITIES = List.of(
            new SentinelCapability(1, "gamepad", "Game Discovery Assistant",
                    "Find games by genre, price, platform, or play style across major stores.", "blue"),
            new SentinelCapability(2, "deal", "Deal Recommendation Support",
                    "Explore personalized deal suggestions, price insights, and sale guidance.", "orange"),
            new SentinelCapability(3, "shield", "Account Safety Guidance",
                    "Review session activity, password strength, and connected-platform safety.", "green"),
            new SentinelCapability(4, "lock", "Cyber Security Awareness",
                    "Learn about phishing, safe store redirects, and gaming-account best practices.", "purple")
    );

    public SentinelStatusResponse getStatus() {
        if (aiProperties.isGeminiConfigured()) {
            return new SentinelStatusResponse(
                    "External AI ready",
                    "Connected",
                    "Gemini enabled",
                    "No chat history saved");
        }
        return new SentinelStatusResponse(
                "Local NEXORA guidance",
                "Connected",
                "External provider optional",
                "No chat history saved");
    }

    public SentinelDemoResponse getDemo() {
        boolean geminiConfigured = aiProperties.isGeminiConfigured();
        List<SentinelStatusItem> systemStatus = List.of(
                new SentinelStatusItem(
                        "Assistant",
                        geminiConfigured ? "External AI ready" : "Local NEXORA guidance",
                        geminiConfigured ? "Gemini" : "Local",
                        "blue",
                        "bot"),
                new SentinelStatusItem(
                        "Backend",
                        "Authenticated insight endpoint",
                        "API",
                        "orange",
                        "network"),
                new SentinelStatusItem(
                        "Provider",
                        geminiConfigured
                                ? "Gemini provider enabled"
                                : "Local by default, external optional",
                        geminiConfigured ? "Enabled" : "Optional",
                        "purple",
                        "spark"),
                new SentinelStatusItem(
                        "Privacy",
                        "No chat history saved",
                        "Safe",
                        "green",
                        "lock"));
        return new SentinelDemoResponse(
                MESSAGES,
                SUGGESTIONS,
                CAPABILITIES,
                systemStatus);
    }

    private static SentinelMessage.Segment segment(String text) {
        return new SentinelMessage.Segment(text, false);
    }

    private static SentinelMessage.Segment emphasizedSegment(String text) {
        return new SentinelMessage.Segment(text, true);
    }
}
