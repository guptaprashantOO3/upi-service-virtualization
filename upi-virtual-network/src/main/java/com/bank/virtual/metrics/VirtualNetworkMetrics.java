package com.bank.virtual.metrics;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;

@Service
public class VirtualNetworkMetrics {

    private final LongAdder totalVirtualBankRequests = new LongAdder();
    private final LongAdder payerDebitRequests = new LongAdder();
    private final LongAdder payeeCreditRequests = new LongAdder();
    private final LongAdder successfulCredits = new LongAdder();
    private final LongAdder declinedCredits = new LongAdder();
    private final LongAdder payerReversals = new LongAdder();
    private final LongAdder payeeStatusEnquiries = new LongAdder();
    private final LongAdder simulatedHttp503Responses = new LongAdder();
    private final LongAdder simulatedTimeouts = new LongAdder();
    private final LongAdder duplicateOperationsPrevented = new LongAdder();

    public synchronized void recordPayerDebitRequest() {
        totalVirtualBankRequests.increment();
        payerDebitRequests.increment();
    }

    public synchronized void recordPayeeCreditRequest() {
        totalVirtualBankRequests.increment();
        payeeCreditRequests.increment();
    }

    public synchronized void recordPayerReversal() {
        totalVirtualBankRequests.increment();
        payerReversals.increment();
    }

    public synchronized void recordPayeeStatusEnquiry() {
        totalVirtualBankRequests.increment();
        payeeStatusEnquiries.increment();
    }

    public synchronized void recordSuccessfulCredit() {
        successfulCredits.increment();
    }

    public synchronized void recordDeclinedCredit() {
        declinedCredits.increment();
    }

    public synchronized void recordSimulatedHttp503Response() {
        simulatedHttp503Responses.increment();
    }

    public synchronized void recordSimulatedTimeout() {
        simulatedTimeouts.increment();
    }

    public synchronized void recordDuplicateOperationPrevented() {
        duplicateOperationsPrevented.increment();
    }

    public synchronized Map<String, Long> snapshot() {
        Map<String, Long> snapshot = new LinkedHashMap<>();
        snapshot.put("totalVirtualBankRequests", totalVirtualBankRequests.sum());
        snapshot.put("payerDebitRequests", payerDebitRequests.sum());
        snapshot.put("payeeCreditRequests", payeeCreditRequests.sum());
        snapshot.put("successfulCredits", successfulCredits.sum());
        snapshot.put("declinedCredits", declinedCredits.sum());
        snapshot.put("payerReversals", payerReversals.sum());
        snapshot.put("payeeStatusEnquiries", payeeStatusEnquiries.sum());
        snapshot.put("simulatedHttp503Responses", simulatedHttp503Responses.sum());
        snapshot.put("simulatedTimeouts", simulatedTimeouts.sum());
        snapshot.put("duplicateOperationsPrevented",
                duplicateOperationsPrevented.sum());
        return snapshot;
    }
}
