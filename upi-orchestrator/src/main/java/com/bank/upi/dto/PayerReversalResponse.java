package com.bank.upi.dto;

import java.math.BigDecimal;

public record PayerReversalResponse(
        String transactionId,
        String status,
        String message,
        BigDecimal updatedBalance
) {}