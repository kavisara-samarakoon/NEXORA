package com.nexora.api.auth.abuse;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;

record AuthAbuseKey(AuthAbuseLimit limit, String subjectDigest) {

    private static final int MAX_SUBJECT_LENGTH = 320;
    private static final String MISSING_SUBJECT = "missing-subject";

    AuthAbuseKey {
        Objects.requireNonNull(limit, "limit");
        Objects.requireNonNull(subjectDigest, "subjectDigest");
    }

    static AuthAbuseKey scoped(AuthAbuseLimit limit, String subject) {
        String normalized = normalize(subject);
        return new AuthAbuseKey(limit, sha256(normalized));
    }

    private static String normalize(String subject) {
        if (subject == null) {
            return MISSING_SUBJECT;
        }

        String normalized = subject.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return MISSING_SUBJECT;
        }
        return normalized.length() <= MAX_SUBJECT_LENGTH
                ? normalized
                : normalized.substring(0, MAX_SUBJECT_LENGTH);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Required SHA-256 digest is unavailable", exception);
        }
    }
}
