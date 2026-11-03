
package com.bank.virtual.dto;

import java.math.BigDecimal;

public record SwitchRequest(
        String transactionId,
        String payerVpa,
        String payeeVpa,
        BigDecimal amount
) {}
