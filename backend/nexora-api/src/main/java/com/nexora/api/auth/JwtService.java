package com.nexora.api.auth;

import com.nexora.api.users.UserAccount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String JWT_ALGORITHM = "HS256";
    private static final String ISSUER = "nexora-api";

    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final Duration expiration;
    private final Clock clock;

    @Autowired
    public JwtService(
            ObjectMapper objectMapper,
            @Value("${nexora.auth.jwt-secret}") String secret,
            @Value("${nexora.auth.jwt-expiration-minutes:60}") long expirationMinutes) {
        this(objectMapper, secret, expirationMinutes, Clock.systemUTC());
    }

    JwtService(ObjectMapper objectMapper, String secret, long expirationMinutes, Clock clock) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalArgumentException("nexora.auth.jwt-secret must contain at least 32 bytes");
        }
        if (expirationMinutes <= 0) {
            throw new IllegalArgumentException("nexora.auth.jwt-expiration-minutes must be positive");
        }
        this.objectMapper = objectMapper;
        this.secret = secretBytes;
        this.expiration = Duration.ofMinutes(expirationMinutes);
        this.clock = clock;
    }

    public String generateToken(UserAccount user) {
        Instant issuedAt = clock.instant();
        Map<String, Object> header = Map.of("alg", JWT_ALGORITHM, "typ", "JWT");
        Map<String, Object> claims = Map.of(
                "sub", user.getId().toString(),
                "iss", ISSUER,
                "iat", issuedAt.getEpochSecond(),
                "exp", issuedAt.plus(expiration).getEpochSecond()
        );

        try {
            String encodedHeader = encode(objectMapper.writeValueAsBytes(header));
            String encodedClaims = encode(objectMapper.writeValueAsBytes(claims));
            String signingInput = encodedHeader + "." + encodedClaims;
            return signingInput + "." + encode(sign(signingInput));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not create access token", exception);
        }
    }

    public Optional<Long> validateAndGetUserId(String token) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) {
                return Optional.empty();
            }

            String signingInput = parts[0] + "." + parts[1];
            byte[] suppliedSignature = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(sign(signingInput), suppliedSignature)) {
                return Optional.empty();
            }

            JsonNode header = decodeJson(parts[0]);
            JsonNode claims = decodeJson(parts[1]);
            if (!JWT_ALGORITHM.equals(header.path("alg").stringValue())
                    || !"JWT".equals(header.path("typ").stringValue())
                    || !ISSUER.equals(claims.path("iss").stringValue())
                    || !claims.path("exp").canConvertToLong()
                    || clock.instant().getEpochSecond() >= claims.path("exp").asLong()) {
                return Optional.empty();
            }

            long userId = Long.parseLong(claims.path("sub").stringValue());
            return userId > 0 ? Optional.of(userId) : Optional.empty();
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    private JsonNode decodeJson(String value) throws Exception {
        return objectMapper.readTree(Base64.getUrlDecoder().decode(value));
    }

    private byte[] sign(String signingInput) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
        return mac.doFinal(signingInput.getBytes(StandardCharsets.US_ASCII));
    }

    private static String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
