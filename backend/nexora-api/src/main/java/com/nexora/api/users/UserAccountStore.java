package com.nexora.api.users;

import java.util.Optional;

public interface UserAccountStore {

    UserAccount save(UserAccount user);

    Optional<UserAccount> findById(long id);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByUsername(String username);

    boolean emailExists(String email);

    boolean usernameExists(String username);
}
