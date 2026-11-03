
package com.bank.virtual.dto;

import java.math.BigDecimal;

public record PayerDebitRequest(
        String transactionId,
        String payerVpa,
        BigDecimal amount
) {}
