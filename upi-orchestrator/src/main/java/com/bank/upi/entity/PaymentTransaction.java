
package com.bank.upi.entity;

import com.bank.upi.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentTransaction {
    private final String transactionId;
    private final String idempotencyKey;
    private final String payerVpa;
    private final String payeeVpa;
    private final BigDecimal amount;
    private volatile PaymentStatus status;
    private volatile String message;
    private final LocalDateTime createdAt;
    private volatile LocalDateTime updatedAt;

    public PaymentTransaction(
            String transactionId,
            String idempotencyKey,
            String payerVpa,
            String payeeVpa,
            BigDecimal amount) {

        this.transactionId = transactionId;
        this.idempotencyKey = idempotencyKey;
        this.payerVpa = payerVpa;
        this.payeeVpa = payeeVpa;
        this.amount = amount;

        this.status = PaymentStatus.INITIATED;
        this.message = "Payment initiated";

        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getPayerVpa() {
        return payerVpa;
    }

    public String getPayeeVpa() {
        return payeeVpa;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void updateStatus(PaymentStatus status, String message) {
        this.status = status;
        this.message = message;
        this.updatedAt = LocalDateTime.now();
    }
}
