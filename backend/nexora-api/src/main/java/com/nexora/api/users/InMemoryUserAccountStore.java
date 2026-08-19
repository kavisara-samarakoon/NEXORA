package com.nexora.api.users;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Profile("!dev")
public class InMemoryUserAccountStore implements UserAccountStore {

    private final AtomicLong ids = new AtomicLong();
    private final Map<Long, UserAccount> users = new ConcurrentHashMap<>();
    private final Map<String, Long> emailIndex = new ConcurrentHashMap<>();
    private final Map<String, Long> usernameIndex = new ConcurrentHashMap<>();

    @Override
    public synchronized UserAccount save(UserAccount user) {
        String emailKey = normalize(user.getEmail());
        String usernameKey = normalize(user.getUsername());
        if (emailIndex.containsKey(emailKey) || usernameIndex.containsKey(usernameKey)) {
            throw new UserAccountConflictException("Email or username is already registered");
        }

        user.assignId(ids.incrementAndGet());
        users.put(user.getId(), user);
        emailIndex.put(emailKey, user.getId());
        usernameIndex.put(usernameKey, user.getId());
        return user;
    }

    @Override
    public Optional<UserAccount> findById(long id) {
        return Optional.ofNullable(users.get(id));
    }

    @Override
    public Optional<UserAccount> findByEmail(String email) {
        return findIndexed(emailIndex, email);
    }

    @Override
    public Optional<UserAccount> findByUsername(String username) {
        return findIndexed(usernameIndex, username);
    }

    @Override
    public boolean emailExists(String email) {
        return emailIndex.containsKey(normalize(email));
    }

    @Override
    public boolean usernameExists(String username) {
        return usernameIndex.containsKey(normalize(username));
    }

    private Optional<UserAccount> findIndexed(Map<String, Long> index, String value) {
        return Optional.ofNullable(index.get(normalize(value))).map(users::get);
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
