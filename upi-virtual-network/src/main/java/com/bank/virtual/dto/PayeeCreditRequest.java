
package com.bank.virtual.dto;

import java.math.BigDecimal;

public record PayeeCreditRequest(
        String transactionId,
        String payeeVpa,
        BigDecimal amount
) {}
