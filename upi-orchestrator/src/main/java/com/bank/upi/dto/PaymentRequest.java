
package com.bank.upi.dto;

import java.math.BigDecimal;

public record PaymentRequest(

        String idempotencyKey,

        String payerVpa,

        String payeeVpa,

        BigDecimal amount

) {}
