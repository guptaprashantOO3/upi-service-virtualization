package com.bank.virtual.payerbank;

import com.bank.virtual.dto.PayerDebitRequest;
import com.bank.virtual.dto.PayerDebitResponse;
import com.bank.virtual.dto.PayerReversalRequest;
import com.bank.virtual.dto.PayerReversalResponse;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VirtualPayerBankService {

    private final ConcurrentHashMap<String, PayerDebitRequest> debitRequests =
            new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, PayerReversalResponse> processedReversals =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, BigDecimal> accounts =
            new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, PayerDebitResponse> processedTransactions =
            new ConcurrentHashMap<>();
    private final VirtualNetworkMetrics metrics;

    @Autowired
    public VirtualPayerBankService(VirtualNetworkMetrics metrics) {
        this.metrics = metrics;
        accounts.put("alice@demo", new BigDecimal("10000.00"));
    }

    public VirtualPayerBankService() {
        this(new VirtualNetworkMetrics());
    }

    public synchronized PayerDebitResponse debit(PayerDebitRequest request) {

        if (request == null || request.transactionId() == null
                || request.transactionId().isBlank()
                || request.payerVpa() == null || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return failure(request, "Invalid debit request");
        }

        // 1. Check whether this transaction was already processed
        PayerDebitResponse existing =
                processedTransactions.get(request.transactionId());

        if (existing != null) {
            metrics.recordDuplicateOperationPrevented();
            PayerDebitRequest original = debitRequests.get(request.transactionId());
            if (!original.payerVpa().equals(request.payerVpa())
                    || original.amount().compareTo(request.amount()) != 0) {
                return failure(request,
                        "Transaction ID reused with different debit details");
            }
            return existing;
        }

        // 3. Check account
        BigDecimal balance = accounts.get(request.payerVpa());

        if (balance == null) {
            return failure(request, "Payer account not found");
        }

        // 4. Check sufficient balance
        if (balance.compareTo(request.amount()) < 0) {
            return failure(request, "Insufficient balance");
        }

        // 5. Deduct amount
        BigDecimal remainingBalance = balance.subtract(request.amount());

        accounts.put(request.payerVpa(), remainingBalance);

        // 6. Store successful transaction response
        PayerDebitResponse response = new PayerDebitResponse(
                request.transactionId(),
                "SUCCESS",
                "Amount debited successfully",
                remainingBalance
        );
        debitRequests.put(request.transactionId(), request);
        processedTransactions.put(request.transactionId(), response);

        return response;
    }

    private PayerDebitResponse failure(
            PayerDebitRequest request, String message) {

        return new PayerDebitResponse(
                request == null ? null : request.transactionId(),
                "FAILED",
                message,
                null
        );
    }
    public synchronized PayerReversalResponse reverse(
            PayerReversalRequest request) {

        if (request == null || request.transactionId() == null
                || request.transactionId().isBlank()) {
            return reversalFailure(request, "Invalid reversal request");
        }

        // 1. Check whether reversal was already completed
        PayerReversalResponse existing =
                processedReversals.get(request.transactionId());

        if (existing != null) {
            metrics.recordDuplicateOperationPrevented();
            if (!existing.message().equals("Amount reversed successfully")
                    || !requestMatchesReversal(request)) {
                return reversalFailure(request,
                        "Transaction ID reused with different reversal details");
            }

            return existing;
        }

        // 2. Validate reversal request
        if (request.payerVpa() == null || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return reversalFailure(request, "Invalid reversal request");
        }

        // 3. Confirm that original debit succeeded
        PayerDebitRequest original =
                debitRequests.get(request.transactionId());

        if (original == null) {
            return reversalFailure(request, "Original debit not found");
        }

        // 4. Verify reversal matches original debit
        if (!original.payerVpa().equals(request.payerVpa())
                || original.amount().compareTo(request.amount()) != 0) {
            return reversalFailure(request,
                    "Reversal details do not match original debit");
        }

        // 5. Refund the amount
        BigDecimal balance = accounts.get(request.payerVpa());
        BigDecimal updatedBalance = balance.add(request.amount());

        accounts.put(request.payerVpa(), updatedBalance);

        // 6. Store reversal result to prevent duplicate refunds
        PayerReversalResponse response = new PayerReversalResponse(
                request.transactionId(),
                "SUCCESS",
                "Amount reversed successfully",
                updatedBalance
        );

        processedReversals.put(request.transactionId(), response);

        return response;
    }

    private boolean requestMatchesReversal(PayerReversalRequest request) {
        PayerDebitRequest original =
                debitRequests.get(request.transactionId());

        return original != null
                && request.payerVpa() != null
                && request.amount() != null
                && original.payerVpa().equals(request.payerVpa())
                && original.amount().compareTo(request.amount()) == 0;
    }

    private PayerReversalResponse reversalFailure(
            PayerReversalRequest request, String message) {

        return new PayerReversalResponse(
                request == null ? null : request.transactionId(),
                "FAILED",
                message,
                null
        );
    }
}
