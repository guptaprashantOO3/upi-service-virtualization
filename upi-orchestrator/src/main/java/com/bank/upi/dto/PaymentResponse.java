
package com.bank.upi.dto;

import com.bank.upi.enums.PaymentStatus;
import java.math.BigDecimal;

public record PaymentResponse(

        String transactionId,
        PaymentStatus status,
        String message,
        BigDecimal amount
) {}
