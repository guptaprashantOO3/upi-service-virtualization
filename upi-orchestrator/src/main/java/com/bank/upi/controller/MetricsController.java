package com.bank.upi.controller;

import com.bank.upi.metrics.PaymentMetrics;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final PaymentMetrics paymentMetrics;

    public MetricsController(PaymentMetrics paymentMetrics) {
        this.paymentMetrics = paymentMetrics;
    }

    @GetMapping
    public Map<String, Long> getMetrics() {
        return paymentMetrics.snapshot();
    }
}
