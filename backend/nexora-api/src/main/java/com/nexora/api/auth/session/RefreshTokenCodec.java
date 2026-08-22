package com.nexora.api.auth.session;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class RefreshTokenCodec {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int TOKEN_BYTES = 32;
    private static final int ENCODED_TOKEN_LENGTH = 43;

    private final byte[] hashSecret;
    private final SecureRandom secureRandom;

    @Autowired
    public RefreshTokenCodec(RefreshSessionProperties properties) {
        this(properties, new SecureRandom());
    }

    RefreshTokenCodec(RefreshSessionProperties properties, SecureRandom secureRandom) {
        this.hashSecret = properties.hashSecret().getBytes(StandardCharsets.UTF_8);
        this.secureRandom = secureRandom;
    }

    public String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hash(String rawToken) {
        if (!isWellFormed(rawToken)) {
            throw new IllegalArgumentException("Refresh token format is invalid");
        }

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hashSecret, HMAC_ALGORITHM));
            return toHex(mac.doFinal(rawToken.getBytes(StandardCharsets.US_ASCII)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Could not hash refresh token", exception);
        }
    }

    public boolean isWellFormed(String rawToken) {
        return rawToken != null
                && rawToken.length() == ENCODED_TOKEN_LENGTH
                && rawToken.matches("[A-Za-z0-9_-]+");
    }

    private static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            result.append(Character.forDigit((value >>> 4) & 0x0f, 16));
            result.append(Character.forDigit(value & 0x0f, 16));
        }
        return result.toString();
    }
}
