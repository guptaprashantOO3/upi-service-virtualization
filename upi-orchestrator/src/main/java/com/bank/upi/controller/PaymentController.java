package com.bank.upi.controller;

import com.bank.upi.dto.PaymentRequest;
import com.bank.upi.dto.PaymentResponse;
import com.bank.upi.service.PaymentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public PaymentResponse createPayment(
            @RequestBody PaymentRequest request) {

        return paymentService.executePayment(request);
    }
    @PostMapping("/{transactionId}/recover")
    public PaymentResponse recoverPayment(
            @PathVariable String transactionId) {
        return paymentService.recoverPayment(transactionId);
    }

    @GetMapping("/{transactionId}")
    public PaymentResponse getPaymentStatus(
            @PathVariable String transactionId) {

        return paymentService.getPaymentStatus(transactionId);
    }
}