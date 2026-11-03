package com.bank.virtual;

import com.bank.virtual.controller.VirtualPayeeBankController;
import com.bank.virtual.controller.VirtualPayerBankController;
import com.bank.virtual.dto.PayeeCreditRequest;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import com.bank.virtual.dto.PayerDebitRequest;
import com.bank.virtual.dto.PayerReversalRequest;
import com.bank.virtual.payeebank.VirtualPayeeBankService;
import com.bank.virtual.payerbank.VirtualPayerBankService;
import com.bank.virtual.scenario.FailureScenario;
import com.bank.virtual.scenario.ScenarioService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VirtualNetworkMetricsTests {

    @Test
    void creditCountersCountOneSuccessAndPreventedDuplicateOnce() {
        VirtualNetworkMetrics metrics = new VirtualNetworkMetrics();
        VirtualPayeeBankService payeeBankService =
                new VirtualPayeeBankService(metrics);
        VirtualPayeeBankController controller = new VirtualPayeeBankController(
                payeeBankService, new ScenarioService(), metrics, 1);
        PayeeCreditRequest request = new PayeeCreditRequest(
                "TXN-metrics-credit", "bob@demo", new BigDecimal("1000.00"));

        controller.credit(request);
        controller.credit(request);

        assertEquals(2L, metrics.snapshot().get("totalVirtualBankRequests"));
        assertEquals(2L, metrics.snapshot().get("payeeCreditRequests"));
        assertEquals(1L, metrics.snapshot().get("successfulCredits"));
        assertEquals(1L,
                metrics.snapshot().get("duplicateOperationsPrevented"));
    }

    @Test
    void simulatedUnavailableResponseCountsIncomingRequestAnd503() {
        VirtualNetworkMetrics metrics = new VirtualNetworkMetrics();
        ScenarioService scenarioService = new ScenarioService();
        scenarioService.setCurrentScenario(FailureScenario.PAYEE_BANK_UNAVAILABLE);
        VirtualPayeeBankController controller = new VirtualPayeeBankController(
                new VirtualPayeeBankService(metrics), scenarioService, metrics, 1);

        controller.credit(new PayeeCreditRequest(
                "TXN-metrics-unavailable", "bob@demo", new BigDecimal("1.00")));

        assertEquals(1L, metrics.snapshot().get("totalVirtualBankRequests"));
        assertEquals(1L, metrics.snapshot().get("payeeCreditRequests"));
        assertEquals(1L, metrics.snapshot().get("simulatedHttp503Responses"));
        assertEquals(0L, metrics.snapshot().get("successfulCredits"));
    }

    @Test
    void payerDebitAndReversalDuplicatesAreCountedAsPreventedOperations() {
        VirtualNetworkMetrics metrics = new VirtualNetworkMetrics();
        VirtualPayerBankService payerBankService =
                new VirtualPayerBankService(metrics);
        VirtualPayerBankController controller = new VirtualPayerBankController(
                payerBankService, new ScenarioService(), metrics);
        PayerDebitRequest debit = new PayerDebitRequest(
                "TXN-metrics-payer", "alice@demo", new BigDecimal("1000.00"));
        PayerReversalRequest reversal = new PayerReversalRequest(
                "TXN-metrics-payer", "alice@demo", new BigDecimal("1000.00"));

        controller.debit(debit);
        controller.debit(debit);
        controller.reverse(reversal);
        controller.reverse(reversal);

        assertEquals(4L, metrics.snapshot().get("totalVirtualBankRequests"));
        assertEquals(2L, metrics.snapshot().get("payerDebitRequests"));
        assertEquals(2L, metrics.snapshot().get("payerReversals"));
        assertEquals(2L,
                metrics.snapshot().get("duplicateOperationsPrevented"));
    }
}
