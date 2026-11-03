package com.bank.virtual;

import com.bank.virtual.controller.VirtualPayeeBankController;
import com.bank.virtual.dto.PayeeCreditRequest;
import com.bank.virtual.dto.PayeeCreditResponse;
import com.bank.virtual.payeebank.VirtualPayeeBankService;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import com.bank.virtual.scenario.FailureScenario;
import com.bank.virtual.scenario.ScenarioService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VirtualPayeeTimeoutScenarioTests {

    @Test
    void timeoutScenarioCommitsCreditBeforeDelayingAndExposesItForEnquiry() {
        VirtualNetworkMetrics metrics = new VirtualNetworkMetrics();
        VirtualPayeeBankService payeeBankService =
                new VirtualPayeeBankService(metrics);
        ScenarioService scenarioService = new ScenarioService();
        scenarioService.setCurrentScenario(
                FailureScenario.PAYEE_TIMEOUT_AFTER_CREDIT);
        VirtualPayeeBankController controller =
                new VirtualPayeeBankController(
                        payeeBankService, scenarioService, metrics, 100);

        long startedAt = System.nanoTime();
        ResponseEntity<PayeeCreditResponse> creditResponse = controller.credit(
                new PayeeCreditRequest(
                        "TXN-timeout-test", "bob@demo", new BigDecimal("1000.00")));
        long elapsedMillis = (System.nanoTime() - startedAt) / 1_000_000;

        assertEquals(200, creditResponse.getStatusCode().value());
        assertEquals("SUCCESS", creditResponse.getBody().status());
        assertTrue(elapsedMillis >= 90,
                "The response should be delayed after the credit is committed");

        ResponseEntity<PayeeCreditResponse> status =
                controller.transactionStatus("TXN-timeout-test");
        assertEquals(200, status.getStatusCode().value());
        assertEquals("SUCCESS", status.getBody().status());
        assertEquals(new BigDecimal("6000.00"),
                status.getBody().updatedBalance());
        assertEquals(1L, metrics.snapshot().get("successfulCredits"));
        assertEquals(1L, metrics.snapshot().get("simulatedTimeouts"));
    }

    @Test
    void transactionStatusReturnsNotFoundWhenCreditHasNoRecord() {
        VirtualPayeeBankController controller =
                new VirtualPayeeBankController(
                        new VirtualPayeeBankService(), new ScenarioService(), 100);

        assertEquals(404,
                controller.transactionStatus("missing").getStatusCode().value());
    }
}
