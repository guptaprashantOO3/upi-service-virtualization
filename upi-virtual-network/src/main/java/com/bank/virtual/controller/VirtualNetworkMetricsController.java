package com.bank.virtual.controller;

import com.bank.virtual.metrics.VirtualNetworkMetrics;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/virtual/admin/metrics")
public class VirtualNetworkMetricsController {

    private final VirtualNetworkMetrics metrics;

    public VirtualNetworkMetricsController(VirtualNetworkMetrics metrics) {
        this.metrics = metrics;
    }

    @GetMapping
    public Map<String, Long> getMetrics() {
        return metrics.snapshot();
    }
}
