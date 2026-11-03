package com.bank.upi.metrics;

import com.bank.upi.enums.PaymentStatus;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

@Service
public class PaymentMetrics {

    private final LongAdder totalPaymentRequests = new LongAdder();
    private final LongAdder uniqueTransactions = new LongAdder();
    private final LongAdder duplicateIdempotencyRequests = new LongAdder();
    private final LongAdder payeeTimeoutOccurrences = new LongAdder();
    private final LongAdder totalProcessingTimeNanos = new LongAdder();
    private final LongAdder completedPaymentRequests = new LongAdder();
    private final EnumMap<PaymentStatus, AtomicLong> paymentsByStatus =
            new EnumMap<>(PaymentStatus.class);

    public PaymentMetrics() {
        for (PaymentStatus status : PaymentStatus.values()) {
            paymentsByStatus.put(status, new AtomicLong());
        }
    }

    public synchronized void recordPaymentRequestStarted() {
        totalPaymentRequests.increment();
    }

    public synchronized void recordPaymentRequestCompleted(long processingTimeNanos) {
        completedPaymentRequests.increment();
        totalProcessingTimeNanos.add(processingTimeNanos);
    }

    public synchronized void recordNewTransaction() {
        uniqueTransactions.increment();
        paymentsByStatus.get(PaymentStatus.INITIATED).incrementAndGet();
    }

    public synchronized void recordDuplicateIdempotencyRequest() {
        duplicateIdempotencyRequests.increment();
    }

    public synchronized void recordPayeeTimeout() {
        payeeTimeoutOccurrences.increment();
    }

    public synchronized void recordStatusTransition(
            PaymentStatus previous, PaymentStatus current) {
        if (previous == current) {
            return;
        }
        if (previous != null) {
            paymentsByStatus.get(previous).decrementAndGet();
        }
        if (current != null) {
            paymentsByStatus.get(current).incrementAndGet();
        }
    }

    public synchronized Map<String, Long> snapshot() {
        long inProgress = paymentsByStatus.get(PaymentStatus.INITIATED).get()
                + paymentsByStatus.get(PaymentStatus.DEBIT_SUCCESS).get()
                + paymentsByStatus.get(PaymentStatus.PROCESSING).get();
        long totalNanos = totalProcessingTimeNanos.sum();
        long samples = completedPaymentRequests.sum();

        Map<String, Long> snapshot = new LinkedHashMap<>();
        snapshot.put("totalPaymentRequests", totalPaymentRequests.sum());
        snapshot.put("uniqueTransactions", uniqueTransactions.sum());
        snapshot.put("successfulPayments", count(PaymentStatus.SUCCESS));
        snapshot.put("failedPayments", count(PaymentStatus.FAILED));
        snapshot.put("pendingPayments", count(PaymentStatus.PENDING));
        snapshot.put("reversedPayments", count(PaymentStatus.REVERSED));
        snapshot.put("reversalPendingPayments", count(PaymentStatus.REVERSAL_PENDING));
        snapshot.put("inProgressPayments", inProgress);
        snapshot.put("payeeTimeoutOccurrences", payeeTimeoutOccurrences.sum());
        snapshot.put("duplicateIdempotencyRequests",
                duplicateIdempotencyRequests.sum());
        snapshot.put("completedPaymentRequests", samples);
        snapshot.put("totalPaymentProcessingTimeNanos", totalNanos);
        snapshot.put("averagePaymentProcessingLatencyNanos",
                samples == 0 ? 0 : totalNanos / samples);
        return snapshot;
    }

    private long count(PaymentStatus status) {
        return paymentsByStatus.get(status).get();
    }
}
