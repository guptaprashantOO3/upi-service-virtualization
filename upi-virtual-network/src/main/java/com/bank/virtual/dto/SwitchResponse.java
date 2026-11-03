
package com.bank.virtual.dto;

public record SwitchResponse(
        String transactionId,
        String status,
        String message,
        String destinationBank
) {}
