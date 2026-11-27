package com.nexora.api.deals;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/deals")
public class ExternalDealController {

    private final ExternalDealService externalDealService;

    public ExternalDealController(ExternalDealService externalDealService) {
        this.externalDealService = externalDealService;
    }

    @GetMapping("/external")
    public List<Deal> getExternalDeals(
            @RequestParam(required = false) @Size(max = 80) String title,
            @RequestParam(required = false) @Min(1) @Max(24) Integer pageSize,
            @RequestParam(required = false) @DecimalMin("0") BigDecimal upperPrice,
            @RequestParam(required = false) @Pattern(
                    regexp = "^(DealRating|Savings|Price|Title|Recent)$",
                    message = "must be one of: DealRating, Savings, Price, Title, Recent")
            String sortBy,
            @RequestParam(required = false) Boolean desc,
            @RequestParam(required = false) @Pattern(
                    regexp = "^\\d+(,\\d+){0,10}$",
                    message = "must be comma-separated numeric store IDs")
            String storeId,
            @RequestParam(required = false) @Min(0) @Max(20) Integer pageNumber) {
        if (sortBy == null && desc == null && storeId == null && pageNumber == null) {
            return externalDealService.getDeals(title, pageSize, upperPrice);
        }
        return externalDealService.getDeals(
                title, pageSize, upperPrice, sortBy, desc, storeId, pageNumber);
    }

    @GetMapping("/live")
    public ExternalDealsCatalogResponse getLiveDeals(
            @RequestParam(required = false) @Size(max = 80) String title,
            @RequestParam(required = false) @Min(1) @Max(24) Integer pageSize,
            @RequestParam(required = false) @DecimalMin("0") BigDecimal upperPrice,
            @RequestParam(required = false) @Pattern(
                    regexp = "^(DealRating|Savings|Price|Title|Recent)$",
                    message = "must be one of: DealRating, Savings, Price, Title, Recent")
            String sortBy,
            @RequestParam(required = false) Boolean desc,
            @RequestParam(required = false) @Pattern(
                    regexp = "^\\d+(,\\d+){0,10}$",
                    message = "must be comma-separated numeric store IDs")
            String storeId,
            @RequestParam(required = false) @Min(0) @Max(20) Integer pageNumber) {
        return externalDealService.getLiveCatalog(
                title, pageSize, upperPrice, sortBy, desc, storeId, pageNumber);
    }
}
