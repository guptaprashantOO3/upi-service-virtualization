
package com.bank.upi.dto;

public record SwitchResponse(
        String transactionId,
        String status,
        String message,
        String destinationBank
) {}
