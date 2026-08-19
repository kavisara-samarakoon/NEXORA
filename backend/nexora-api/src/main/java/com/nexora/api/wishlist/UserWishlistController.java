package com.nexora.api.wishlist;

import com.nexora.api.auth.AuthenticatedUserIdResolver;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/wishlist")
public class UserWishlistController {

    private final UserWishlistService userWishlistService;
    private final AuthenticatedUserIdResolver userIdResolver;

    public UserWishlistController(
            UserWishlistService userWishlistService,
            AuthenticatedUserIdResolver userIdResolver) {
        this.userWishlistService = userWishlistService;
        this.userIdResolver = userIdResolver;
    }

    @GetMapping
    public List<WishlistItem> getWishlistItems(Authentication authentication) {
        return userWishlistService.getWishlistItems(userIdResolver.resolve(authentication));
    }

    @PostMapping
    public ResponseEntity<WishlistItem> addWishlistItem(
            Authentication authentication,
            @Valid @RequestBody AddWishlistItemRequest request) {
        WishlistItem item = userWishlistService.addWishlistItem(
                userIdResolver.resolve(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWishlistItem(
            Authentication authentication,
            @PathVariable long id) {
        userWishlistService.deleteWishlistItem(userIdResolver.resolve(authentication), id);
        return ResponseEntity.noContent().build();
    }
}
