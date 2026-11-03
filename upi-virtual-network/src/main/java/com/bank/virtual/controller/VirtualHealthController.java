
package com.bank.virtual.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class VirtualHealthController {

    @GetMapping("/virtual/health")
    public Map<String, String> health() {
        return Map.of(
                "application", "Virtual UPI Network",
                "status", "UP"
        );
    }
}
