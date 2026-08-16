package com.nexora.api.deals;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealCatalogService dealService;

    public DealController(DealCatalogService dealService) {
        this.dealService = dealService;
    }

    @GetMapping
    public List<Deal> getDeals() {
        return dealService.getDeals();
    }
}
