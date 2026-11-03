package com.bank.virtual.payeebank;

import com.bank.virtual.dto.PayeeCreditRequest;
import com.bank.virtual.dto.PayeeCreditResponse;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VirtualPayeeBankService {

    private final ConcurrentHashMap<String, BigDecimal> accounts =
            new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, PayeeCreditResponse> processedTransactions =
            new ConcurrentHashMap<>();
    private final VirtualNetworkMetrics metrics;

    @Autowired
    public VirtualPayeeBankService(VirtualNetworkMetrics metrics) {
        this.metrics = metrics;
        accounts.put("bob@demo", new BigDecimal("5000.00"));
    }

    public VirtualPayeeBankService() {
        this(new VirtualNetworkMetrics());
    }

    public synchronized PayeeCreditResponse credit(PayeeCreditRequest request) {

        // 1. Check for duplicate transaction
        PayeeCreditResponse existing =
                processedTransactions.get(request.transactionId());

        if (existing != null) {
            metrics.recordDuplicateOperationPrevented();
            return existing;
        }

        // 2. Validate request
        if (request.payeeVpa() == null || request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return failure(request, "Invalid credit request");
        }

        // 3. Check payee account
        BigDecimal balance = accounts.get(request.payeeVpa());

        if (balance == null) {
            return failure(request, "Payee account not found");
        }

        // 4. Calculate new balance
        BigDecimal updatedBalance = balance.add(request.amount());

        // 5. Update account balance
        accounts.put(request.payeeVpa(), updatedBalance);

        // 6. Save transaction response
        PayeeCreditResponse response = new PayeeCreditResponse(
                request.transactionId(),
                "SUCCESS",
                "Amount credited successfully",
                updatedBalance
        );

        processedTransactions.put(request.transactionId(), response);
        metrics.recordSuccessfulCredit();

        return response;
    }

    public Optional<PayeeCreditResponse> findProcessedTransaction(
            String transactionId) {
        return Optional.ofNullable(processedTransactions.get(transactionId));
    }

    private PayeeCreditResponse failure(
            PayeeCreditRequest request, String message) {

        metrics.recordDeclinedCredit();

        return new PayeeCreditResponse(
                request.transactionId(),
                "FAILED",
                message,
                null
        );
    }
}
