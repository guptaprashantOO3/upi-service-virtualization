package com.bank.upi.dto;

import java.math.BigDecimal;

public record PayerDebitResponse(
        String transactionId,
        String status,
        String message,
        BigDecimal remainingBalance
) {}