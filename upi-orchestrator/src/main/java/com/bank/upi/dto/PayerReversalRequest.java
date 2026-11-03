package com.bank.upi.dto;

import java.math.BigDecimal;

public record PayerReversalRequest(
        String transactionId,
        String payerVpa,
        BigDecimal amount
) {}