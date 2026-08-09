package com.nexora.api.home;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HomeController {

    @GetMapping
    public WelcomeResponse welcome() {
        return new WelcomeResponse(
                "Welcome to NEXORA API",
                "Next.js",
                "Backend foundation ready"
        );
    }
}

