package com.nexora.api.sentinel;

import java.util.List;

public record SentinelMessage(
        long id,
        String role,
        List<Segment> segments
) {
    public record Segment(String text, boolean emphasis) {
    }
}

