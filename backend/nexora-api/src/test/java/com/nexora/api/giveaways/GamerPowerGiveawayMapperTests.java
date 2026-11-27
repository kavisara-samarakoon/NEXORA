package com.nexora.api.giveaways;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class GamerPowerGiveawayMapperTests {

    private final Clock fixedClock = Clock.fixed(
            Instant.parse("2026-11-25T12:00:00Z"), ZoneOffset.UTC);
    private final GamerPowerGiveawayMapper mapper = new GamerPowerGiveawayMapper(fixedClock);

    @Test
    void mapsValidLiveGiveawayAndNormalizesDatesPlatformAndHttpsUrls() {
        GamerPowerGiveawayResponse raw = new GamerPowerGiveawayResponse(
                3101L,
                "  Starlight Tactics (Steam)  ",
                "$14.99",
                "https://www.gamerpower.com/offers/1/thumb.jpg",
                "https://www.gamerpower.com/offers/1/full.jpg",
                "Free tactical RPG weekend key.",
                "Click Get Giveaway and redeem on Steam.",
                "https://www.gamerpower.com/open/starlight-tactics",
                "2026-11-24 10:00:00",
                "Game",
                "PC, Steam",
                "2026-11-27 12:00:00",
                1250,
                "Active",
                "https://www.gamerpower.com/starlight-tactics",
                "https://www.gamerpower.com/open/starlight-tactics"
        );

        List<LiveGiveaway> mapped = mapper.toLiveGiveaways(List.of(raw));

        assertEquals(1, mapped.size());
        LiveGiveaway item = mapped.get(0);
        assertAll(
                () -> assertEquals(3101L, item.id()),
                () -> assertEquals("Starlight Tactics (Steam)", item.title()),
                () -> assertEquals("$14.99", item.worth()),
                () -> assertEquals("Steam", item.platformLabel()),
                () -> assertEquals("active", item.status()),
                () -> assertEquals(2, item.daysRemaining()),
                () -> assertEquals("https://www.gamerpower.com/open/starlight-tactics", item.claimUrl()),
                () -> assertEquals("gamerpower", item.source()),
                () -> assertEquals("GamerPower", item.sourceAttribution())
        );
    }

    @Test
    void detectsExpiredAndUnknownStatusesAndRejectsUntrustedOrInsecureClaimUrls() {
        GamerPowerGiveawayResponse expiredByDate = new GamerPowerGiveawayResponse(
                3102L, "Expired Quest", "N/A",
                "http://insecure.gamerpower.com/thumb.jpg",
                null, "Desc", "Instr",
                "https://www.gamerpower.com/open/expired-quest",
                "2026-11-01 00:00:00",
                "Game", "Epic Games Store",
                "2026-11-20 00:00:00",
                10, "Active", null, null
        );
        GamerPowerGiveawayResponse unknownStatus = new GamerPowerGiveawayResponse(
                3103L, "Mystery Drop", null,
                null, null, null, null,
                "https://gamerpower.com/open/mystery-drop",
                null, "Loot", "PC",
                "N/A", null, "Mystery", null, null
        );
        GamerPowerGiveawayResponse untrustedHost = new GamerPowerGiveawayResponse(
                3104L, "Bad Host Drop", "$5.00",
                null, null, "Desc", "Instr",
                "https://evil.example.com/claim",
                null, "Game", "PC",
                null, null, "Active",
                "http://www.gamerpower.com/insecure",
                null
        );

        List<LiveGiveaway> mapped = mapper.toLiveGiveaways(
                List.of(expiredByDate, unknownStatus, untrustedHost));

        assertEquals(2, mapped.size());
        assertEquals("expired", mapped.get(0).status());
        assertEquals(0, mapped.get(0).daysRemaining());
        assertNull(mapped.get(0).worth());
        assertNull(mapped.get(0).thumbnailUrl());
        assertEquals("Epic Games", mapped.get(0).platformLabel());

        assertEquals("unknown", mapped.get(1).status());
        assertNull(mapped.get(1).endsAtUtc());
        assertNull(mapped.get(1).daysRemaining());
    }
}
