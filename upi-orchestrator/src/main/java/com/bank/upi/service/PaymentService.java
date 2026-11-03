
package com.bank.upi.service;

import com.bank.upi.client.VirtualNetworkClient;
import com.bank.upi.dto.PaymentRequest;
import com.bank.upi.dto.PaymentResponse;
import com.bank.upi.dto.PayerDebitRequest;
import com.bank.upi.dto.PayerDebitResponse;
import com.bank.upi.dto.PayerReversalRequest;
import com.bank.upi.dto.PayerReversalResponse;
import com.bank.upi.dto.PayeeCreditRequest;
import com.bank.upi.dto.PayeeCreditResponse;
import com.bank.upi.dto.SwitchRequest;
import com.bank.upi.dto.SwitchResponse;
import com.bank.upi.entity.PaymentTransaction;
import com.bank.upi.enums.PaymentStatus;
import com.bank.upi.repository.PaymentRepository;
import com.bank.upi.metrics.PaymentMetrics;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.concurrent.TimeoutException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.web.client.RestClientException;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final VirtualNetworkClient virtualNetworkClient;
    private final PaymentMetrics paymentMetrics;
    private final ConcurrentMap<String, ReentrantLock> transactionLocks =
            new ConcurrentHashMap<>();

    public PaymentService(
            PaymentRepository paymentRepository,
            VirtualNetworkClient virtualNetworkClient,
            PaymentMetrics paymentMetrics) {

        this.paymentRepository = paymentRepository;
        this.virtualNetworkClient = virtualNetworkClient;
        this.paymentMetrics = paymentMetrics;
    }

    // Main payment execution method
    public PaymentResponse executePayment(PaymentRequest request) {
        paymentMetrics.recordPaymentRequestStarted();
        long startedAt = System.nanoTime();
        try {
            return executePaymentInternal(request);
        } finally {
            paymentMetrics.recordPaymentRequestCompleted(
                    System.nanoTime() - startedAt);
        }
    }

    private PaymentResponse executePaymentInternal(PaymentRequest request) {
        PaymentResponse initiated = initiatePayment(request);
        PaymentTransaction transaction = paymentRepository
                .findByTransactionId(initiated.transactionId())
                .orElseThrow();

        return withTransactionLock(transaction,
                () -> executePaymentLocked(transaction));
    }

    private PaymentResponse executePaymentLocked(
            PaymentTransaction transaction) {

        // Step 2: Return existing final result for duplicate requests
        if (transaction.getStatus() != PaymentStatus.INITIATED) {

            return toResponse(transaction);
        }

        try {

            // Step 3: Debit payer bank
            PayerDebitResponse debitResponse =
                    virtualNetworkClient.debitPayer(
                            new PayerDebitRequest(
                                    transaction.getTransactionId(),
                                    transaction.getPayerVpa(),
                                    transaction.getAmount()
                            )
                    );

            if (debitResponse == null
                    || !"SUCCESS".equals(debitResponse.status())) {

                updateStatus(transaction, PaymentStatus.FAILED,
                        debitResponse == null
                                ? "Payer bank returned empty response"
                                : debitResponse.message()
                );

                return toResponse(transaction);
            }

            updateStatus(transaction, PaymentStatus.DEBIT_SUCCESS,
                    "Payer account debited successfully"
            );

            // Step 4: Route payment through virtual UPI switch
            updateStatus(transaction, PaymentStatus.PROCESSING,
                    "Payment is being routed"
            );

            SwitchResponse switchResponse =
                    virtualNetworkClient.routePayment(
                            new SwitchRequest(
                                    transaction.getTransactionId(),
                                    transaction.getPayerVpa(),
                                    transaction.getPayeeVpa(),
                                    transaction.getAmount()
                            )
                    );

            if (switchResponse == null
                    || !"SUCCESS".equals(switchResponse.status())) {

                return reversePayment(
                        transaction,
                        "UPI switch routing failed"
                );
            }

            // Step 5: Credit payee bank
            PayeeCreditResponse creditResponse;
            try {
                creditResponse = virtualNetworkClient.creditPayee(
                        new PayeeCreditRequest(
                                transaction.getTransactionId(),
                                transaction.getPayeeVpa(),
                                transaction.getAmount()
                        )
                );
            } catch (HttpServerErrorException exception) {
                if (exception.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                    return reversePayment(
                            transaction,
                            "Payee bank unavailable (HTTP 503)"
                    );
                }

                if (isTimeout(exception)) {
                    paymentMetrics.recordPayeeTimeout();
                }
                updateStatus(transaction, PaymentStatus.PENDING,
                        "Payee credit outcome uncertain; recover by querying payee status"
                );
                return toResponse(transaction);
            } catch (RestClientException exception) {
                if (isTimeout(exception)) {
                    paymentMetrics.recordPayeeTimeout();
                }
                updateStatus(transaction, PaymentStatus.PENDING,
                        "Payee credit outcome uncertain; recover by querying payee status"
                );
                return toResponse(transaction);
            }

            if (creditResponse == null
                    || !"SUCCESS".equals(creditResponse.status())) {

                return reversePayment(
                        transaction,
                        creditResponse == null
                                ? "Payee bank returned empty response"
                                : creditResponse.message()
                );
            }

            // Step 6: Mark payment successful
            updateStatus(transaction, PaymentStatus.SUCCESS,
                    "Payment completed successfully"
            );

            return toResponse(transaction);

        } catch (Exception exception) {

            updateStatus(transaction, PaymentStatus.PENDING,
                    "Payment outcome uncertain: " + exception.getMessage()
            );

            return toResponse(transaction);
        }
    }

    // Create a new transaction or return an existing one
    public synchronized PaymentResponse initiatePayment(PaymentRequest request) {

        validateRequest(request);

        var existingTransaction =
                paymentRepository.findByIdempotencyKey(
                        request.idempotencyKey()
                );

        if (existingTransaction.isPresent()) {

            PaymentTransaction existing = existingTransaction.get();

            paymentMetrics.recordDuplicateIdempotencyRequest();

            if (!existing.getPayerVpa().equals(request.payerVpa())
                    || !existing.getPayeeVpa().equals(request.payeeVpa())
                    || existing.getAmount().compareTo(request.amount()) != 0) {

                throw new IllegalArgumentException(
                        "Idempotency key already used with different payment details"
                );
            }

            return toResponse(existing);
        }

        String transactionId = "TXN-" + UUID.randomUUID();

        PaymentTransaction transaction = new PaymentTransaction(
                transactionId,
                request.idempotencyKey(),
                request.payerVpa(),
                request.payeeVpa(),
                request.amount()
        );

        paymentRepository.save(transaction);
        paymentMetrics.recordNewTransaction();

        return toResponse(transaction);
    }

    public PaymentResponse recoverPayment(String transactionId) {
        PaymentTransaction transaction = paymentRepository
                .findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Transaction not found: " + transactionId
                ));

        return withTransactionLock(transaction,
                () -> recoverPaymentLocked(transaction));
    }

    private PaymentResponse recoverPaymentLocked(
            PaymentTransaction transaction) {
        if (transaction.getStatus() != PaymentStatus.PENDING) {
            return toResponse(transaction);
        }

        try {
            PayeeCreditResponse creditStatus =
                    virtualNetworkClient.getPayeeCreditStatus(
                            transaction.getTransactionId());

            if (creditStatus == null) {
                updateStatus(transaction, PaymentStatus.PENDING,
                        "Payee credit is not recorded; outcome remains uncertain"
                );
            } else if ("SUCCESS".equals(creditStatus.status())) {
                updateStatus(transaction, PaymentStatus.SUCCESS,
                        "Payee credit confirmed by transaction enquiry"
                );
            } else if ("FAILED".equals(creditStatus.status())) {
                return reversePayment(
                        transaction,
                        creditStatus.message() == null
                                ? "Payee bank confirmed credit failure"
                                : creditStatus.message()
                );
            } else {
                updateStatus(transaction, PaymentStatus.PENDING,
                        "Payee transaction status is inconclusive"
                );
            }
        } catch (Exception exception) {
            updateStatus(transaction, PaymentStatus.PENDING,
                    "Payee status enquiry failed; outcome remains uncertain: "
                            + exception.getMessage()
            );
        }

        return toResponse(transaction);
    }

    private PaymentResponse withTransactionLock(
            PaymentTransaction transaction,
            Supplier<PaymentResponse> operation) {
        ReentrantLock lock = transactionLocks.computeIfAbsent(
                transaction.getTransactionId(), ignored -> new ReentrantLock());
        lock.lock();
        try {
            return operation.get();
        } finally {
            lock.unlock();
        }
    }

    // Reverse payer debit if a definitive downstream failure occurs
    private PaymentResponse reversePayment(
            PaymentTransaction transaction,
            String failureReason) {

        updateStatus(transaction, PaymentStatus.REVERSAL_PENDING,
                failureReason + ". Reversal initiated."
        );

        try {

            PayerReversalResponse reversalResponse =
                    virtualNetworkClient.reversePayer(
                            new PayerReversalRequest(
                                    transaction.getTransactionId(),
                                    transaction.getPayerVpa(),
                                    transaction.getAmount()
                            )
                    );

            if (reversalResponse != null
                    && "SUCCESS".equals(reversalResponse.status())) {

                updateStatus(transaction, PaymentStatus.REVERSED,
                        failureReason + ". Amount successfully reversed."
                );

            } else {

                updateStatus(transaction, PaymentStatus.REVERSAL_PENDING,
                        failureReason + ". Reversal failed or needs retry."
                );
            }

        } catch (Exception exception) {

            updateStatus(transaction, PaymentStatus.REVERSAL_PENDING,
                    failureReason + ". Reversal communication failed: "
                            + exception.getMessage()
            );
        }

        return toResponse(transaction);
    }

    // Validate incoming payment request
    private void validateRequest(PaymentRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Payment request cannot be null"
            );
        }

        if (request.idempotencyKey() == null
                || request.idempotencyKey().isBlank()) {

            throw new IllegalArgumentException(
                    "Idempotency key is required"
            );
        }

        if (request.payerVpa() == null
                || request.payerVpa().isBlank()) {

            throw new IllegalArgumentException(
                    "Payer VPA is required"
            );
        }

        if (request.payeeVpa() == null
                || request.payeeVpa().isBlank()) {

            throw new IllegalArgumentException(
                    "Payee VPA is required"
            );
        }

        if (request.amount() == null
                || request.amount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero"
            );
        }
    }

    private void updateStatus(
            PaymentTransaction transaction,
            PaymentStatus status,
            String message) {
        PaymentStatus previous = transaction.getStatus();
        transaction.updateStatus(status, message);
        paymentMetrics.recordStatusTransition(previous, status);
    }

    private boolean isTimeout(Throwable failure) {
        Throwable cause = failure;
        while (cause != null) {
            if (cause instanceof SocketTimeoutException
                    || cause instanceof HttpTimeoutException
                    || cause instanceof TimeoutException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    // Convert entity into API response DTO
    private PaymentResponse toResponse(PaymentTransaction transaction) {

        return new PaymentResponse(
                transaction.getTransactionId(),
                transaction.getStatus(),
                transaction.getMessage(),
                transaction.getAmount()
        );
    }

    public PaymentResponse getPaymentStatus(String transactionId) {

        PaymentTransaction transaction = paymentRepository
                .findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Transaction not found: " + transactionId
                ));

        return toResponse(transaction);
    }
}
