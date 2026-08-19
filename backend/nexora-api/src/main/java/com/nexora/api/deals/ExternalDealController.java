package com.nexora.api.deals;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
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
@RequestMapping("/api/deals/external")
public class ExternalDealController {

    private final ExternalDealService externalDealService;

    public ExternalDealController(ExternalDealService externalDealService) {
        this.externalDealService = externalDealService;
    }

    @GetMapping
    public List<Deal> getExternalDeals(
            @RequestParam(required = false) @Size(max = 80) String title,
            @RequestParam(required = false) @Min(1) Integer pageSize,
            @RequestParam(required = false) @DecimalMin(value = "0", inclusive = false) BigDecimal upperPrice) {
        return externalDealService.getDeals(title, pageSize, upperPrice);
    }
}
