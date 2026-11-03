
package com.bank.virtual.dto;

import java.math.BigDecimal;

public record PayerDebitResponse(
        String transactionId,
        String status,
        String message,
        BigDecimal remainingBalance
) {}
