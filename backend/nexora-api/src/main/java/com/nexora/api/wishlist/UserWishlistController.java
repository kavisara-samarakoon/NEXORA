package com.nexora.api.wishlist;

import com.nexora.api.auth.AuthenticatedUserIdResolver;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@RestController
@RequestMapping("/api/me/wishlist")
@Validated
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

    @GetMapping("/alert-events")
    public List<WishlistAlertEventResponse> getWishlistAlertEvents(
            Authentication authentication) {
        return userWishlistService.getWishlistAlertEvents(
                userIdResolver.resolve(authentication));
    }

    @GetMapping("/{id}/price-history")
    public List<WishlistPriceHistoryPoint> getWishlistPriceHistory(
            Authentication authentication,
            @PathVariable long id,
            @RequestParam(defaultValue = "30") @Min(1) @Max(90) int limit) {
        return userWishlistService.getWishlistPriceHistory(
                userIdResolver.resolve(authentication), id, limit);
    }

    @PostMapping
    public ResponseEntity<WishlistItem> addWishlistItem(
            Authentication authentication,
            @Valid @RequestBody AddWishlistItemRequest request) {
        WishlistItem item = userWishlistService.addWishlistItem(
                userIdResolver.resolve(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @PatchMapping("/{id}/alert")
    public WishlistItem updateWishlistAlert(
            Authentication authentication,
            @PathVariable long id,
            @Valid @RequestBody UpdateWishlistAlertRequest request) {
        return userWishlistService.updateWishlistAlert(
                userIdResolver.resolve(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWishlistItem(
            Authentication authentication,
            @PathVariable long id) {
        userWishlistService.deleteWishlistItem(userIdResolver.resolve(authentication), id);
        return ResponseEntity.noContent().build();
    }
}
