package com.bank.upi;

import com.bank.upi.client.VirtualNetworkClient;
import com.bank.upi.metrics.PaymentMetrics;
import com.bank.upi.dto.PayeeCreditResponse;
import com.bank.upi.dto.PaymentRequest;
import com.bank.upi.dto.PayerDebitResponse;
import com.bank.upi.dto.SwitchResponse;
import com.bank.upi.enums.PaymentStatus;
import com.bank.upi.repository.PaymentRepository;
import com.bank.upi.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.ResourceAccessException;

import java.net.SocketTimeoutException;
import java.util.Map;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentTimeoutRecoveryTests {

    @Mock
    private VirtualNetworkClient virtualNetworkClient;

    private PaymentService paymentService;
    private PaymentMetrics paymentMetrics;

    @BeforeEach
    void setUp() {
        paymentMetrics = new PaymentMetrics();
        paymentService = new PaymentService(
                new PaymentRepository(), virtualNetworkClient, paymentMetrics);
        when(virtualNetworkClient.debitPayer(any()))
                .thenReturn(new PayerDebitResponse(
                        "ignored", "SUCCESS", "debited", new BigDecimal("9000.00")));
        when(virtualNetworkClient.routePayment(any()))
                .thenReturn(new SwitchResponse(
                        "ignored", "SUCCESS", "routed", "demo"));
    }

    @Test
    void confirmedCreditAfterTimeoutRecoversToSuccessWithoutRetriedCredit() {
        when(virtualNetworkClient.creditPayee(any()))
                .thenThrow(new ResourceAccessException("Read timed out",
                        new SocketTimeoutException("Read timed out")));

        var pending = paymentService.executePayment(request("timeout-confirmed"));
        assertEquals(PaymentStatus.PENDING, pending.status());
        assertEquals(1L, paymentMetrics.snapshot().get("payeeTimeoutOccurrences"));
        assertEquals(1L, paymentMetrics.snapshot().get("pendingPayments"));
        verify(virtualNetworkClient, never()).reversePayer(any());

        when(virtualNetworkClient.getPayeeCreditStatus(pending.transactionId()))
                .thenReturn(new PayeeCreditResponse(
                        pending.transactionId(), "SUCCESS",
                        "Amount credited successfully", new BigDecimal("6000.00")));

        var recovered = paymentService.recoverPayment(pending.transactionId());

        assertEquals(PaymentStatus.SUCCESS, recovered.status());
        assertEquals(0L, paymentMetrics.snapshot().get("pendingPayments"));
        assertEquals(1L, paymentMetrics.snapshot().get("successfulPayments"));
        verify(virtualNetworkClient, times(1)).creditPayee(any());
        verify(virtualNetworkClient, never()).reversePayer(any());
    }

    @Test
    void missingPayeeRecordStaysPendingAndDuplicateRequestDoesNotRetryCredit() {
        when(virtualNetworkClient.creditPayee(any()))
                .thenThrow(new ResourceAccessException("Read timed out",
                        new SocketTimeoutException("Read timed out")));

        var pending = paymentService.executePayment(request("timeout-no-record"));
        when(virtualNetworkClient.getPayeeCreditStatus(pending.transactionId()))
                .thenReturn(null);

        var unresolved = paymentService.recoverPayment(pending.transactionId());
        var duplicate = paymentService.executePayment(request("timeout-no-record"));

        assertEquals(PaymentStatus.PENDING, unresolved.status());
        assertEquals(PaymentStatus.PENDING, duplicate.status());
        assertEquals(1L,
                paymentMetrics.snapshot().get("duplicateIdempotencyRequests"));
        verify(virtualNetworkClient, times(1)).creditPayee(any());
        verify(virtualNetworkClient, never()).reversePayer(any());
    }

    @Test
    void duplicatePaymentRequestCountsRequestButNotAnotherTransactionOrSuccess() {
        when(virtualNetworkClient.creditPayee(any()))
                .thenReturn(new PayeeCreditResponse(
                        "ignored", "SUCCESS", "credited", new BigDecimal("6000.00")));

        var first = paymentService.executePayment(request("metrics-duplicate"));
        var duplicate = paymentService.executePayment(request("metrics-duplicate"));
        Map<String, Long> snapshot = paymentMetrics.snapshot();

        assertEquals(PaymentStatus.SUCCESS, first.status());
        assertEquals(first.transactionId(), duplicate.transactionId());
        assertEquals(2L, snapshot.get("totalPaymentRequests"));
        assertEquals(1L, snapshot.get("uniqueTransactions"));
        assertEquals(1L, snapshot.get("duplicateIdempotencyRequests"));
        assertEquals(1L, snapshot.get("successfulPayments"));
        assertEquals(0L, snapshot.get("inProgressPayments"));
        assertEquals(2L, snapshot.get("completedPaymentRequests"));
        assertEquals(snapshot.get("totalPaymentProcessingTimeNanos") / 2,
                snapshot.get("averagePaymentProcessingLatencyNanos"));
        verify(virtualNetworkClient, times(1)).creditPayee(any());
    }

    private PaymentRequest request(String idempotencyKey) {
        return new PaymentRequest(
                idempotencyKey, "alice@demo", "bob@demo",
                new BigDecimal("1000.00"));
    }
}
