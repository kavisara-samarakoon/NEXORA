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

    private static final List<SentinelMessage> MESSAGES = List.of(
            new SentinelMessage(1, "user", List.of(
                    segment("Find me co-op games under $15")
            )),
            new SentinelMessage(2, "ai", List.of(
                    segment("I found "),
                    emphasizedSegment("12 co-op games"),
                    segment(" under $15 across Steam and Epic Games. Top picks: "),
                    emphasizedSegment("It Takes Two ($9.99)"),
                    segment(", "),
                    emphasizedSegment("Deep Rock Galactic ($7.49)"),
                    segment(", and "),
                    emphasizedSegment("Stardew Valley ($11.99)"),
                    segment(". Want me to add any to your wishlist?")
            )),
            new SentinelMessage(3, "user", List.of(
                    segment("Add It Takes Two to my wishlist and set a price alert for $7")
            )),
            new SentinelMessage(4, "ai", List.of(
                    segment("Preview complete. "),
                    emphasizedSegment("It Takes Two"),
                    segment(" would be added with a target price of "),
                    emphasizedSegment("$7.00"),
                    segment(". Live wishlist actions require a future integration.")
            ))
    );

    private static final List<String> SUGGESTIONS = List.of(
            "Find RPGs under $20",
            "When is the next Steam sale?",
            "Free games this week",
            "Is my account secure?",
            "Compare Elden Ring prices"
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
                    "Gemini Provider Foundation",
                    "Connected",
                    "Gemini Enabled",
                    "No messages saved");
        }
        return new SentinelStatusResponse(
                "Gateway Foundation",
                "Connected",
                "Gemini Disabled",
                "No messages saved");
    }

    public SentinelDemoResponse getDemo() {
        boolean geminiConfigured = aiProperties.isGeminiConfigured();
        List<SentinelStatusItem> systemStatus = List.of(
                new SentinelStatusItem(
                        "AI Status",
                        geminiConfigured ? "Gemini Provider Foundation" : "Gateway Foundation",
                        geminiConfigured ? "Gemini" : "Local",
                        "blue",
                        "bot"),
                new SentinelStatusItem("Backend", "Connected", "Online", "green", "network"),
                new SentinelStatusItem(
                        "Provider",
                        geminiConfigured
                                ? "Gemini Enabled"
                                : "Local Preview / Gemini Disabled",
                        geminiConfigured ? "Enabled" : "External off",
                        "purple",
                        "spark"),
                new SentinelStatusItem(
                        "Privacy", "No messages saved", "Safe", "green", "lock"));
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
