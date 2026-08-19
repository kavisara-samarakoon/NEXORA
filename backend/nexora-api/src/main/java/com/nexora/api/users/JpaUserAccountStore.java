package com.nexora.api.users;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Profile("dev")
public class JpaUserAccountStore implements UserAccountStore {

    private final UserAccountRepository repository;

    public JpaUserAccountStore(UserAccountRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserAccount save(UserAccount user) {
        return repository.saveAndFlush(user);
    }

    @Override
    public Optional<UserAccount> findById(long id) {
        return repository.findById(id);
    }

    @Override
    public Optional<UserAccount> findByEmail(String email) {
        return repository.findByEmailIgnoreCase(email);
    }

    @Override
    public Optional<UserAccount> findByUsername(String username) {
        return repository.findByUsernameIgnoreCase(username);
    }

    @Override
    public boolean emailExists(String email) {
        return repository.existsByEmailIgnoreCase(email);
    }

    @Override
    public boolean usernameExists(String username) {
        return repository.existsByUsernameIgnoreCase(username);
    }
}
