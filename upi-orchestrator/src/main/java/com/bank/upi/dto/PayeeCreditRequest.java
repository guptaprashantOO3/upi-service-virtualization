package com.bank.upi.dto;

import java.math.BigDecimal;

public record PayeeCreditRequest(
        String transactionId,
        String payeeVpa,
        BigDecimal amount
) {}