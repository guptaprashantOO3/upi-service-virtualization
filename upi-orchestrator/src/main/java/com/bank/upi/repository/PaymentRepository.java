
package com.bank.upi.repository;

import com.bank.upi.entity.PaymentTransaction;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class PaymentRepository {

    private final ConcurrentHashMap<String, PaymentTransaction>
            transactions = new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, String>
            idempotencyIndex = new ConcurrentHashMap<>();

    public void save(PaymentTransaction transaction) {

        transactions.put(
                transaction.getTransactionId(),
                transaction
        );

        idempotencyIndex.put(
                transaction.getIdempotencyKey(),
                transaction.getTransactionId()
        );
    }

    public Optional<PaymentTransaction> findByTransactionId(
            String transactionId) {

        return Optional.ofNullable(
                transactions.get(transactionId)
        );
    }

    public Optional<PaymentTransaction> findByIdempotencyKey(
            String idempotencyKey) {

        String transactionId = idempotencyIndex.get(idempotencyKey);

        if (transactionId == null) {
            return Optional.empty();
        }

        return findByTransactionId(transactionId);
    }
}
