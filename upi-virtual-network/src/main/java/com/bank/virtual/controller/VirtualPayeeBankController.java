package com.bank.virtual.controller;

import com.bank.virtual.dto.PayeeCreditRequest;
import com.bank.virtual.dto.PayeeCreditResponse;
import com.bank.virtual.payeebank.VirtualPayeeBankService;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import com.bank.virtual.scenario.FailureScenario;
import com.bank.virtual.scenario.ScenarioService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/virtual/payee")
public class VirtualPayeeBankController {

    private final VirtualPayeeBankService payeeBankService;
    private final ScenarioService scenarioService;
    private final VirtualNetworkMetrics metrics;
    private final long timeoutAfterCreditDelayMillis;

    @Autowired
    public VirtualPayeeBankController(
            VirtualPayeeBankService payeeBankService,
            ScenarioService scenarioService,
            VirtualNetworkMetrics metrics,
            @Value("${scenario.payee-timeout-after-credit.delay-ms:3000}")
            long timeoutAfterCreditDelayMillis) {

        this.payeeBankService = payeeBankService;
        this.scenarioService = scenarioService;
        this.metrics = metrics;
        this.timeoutAfterCreditDelayMillis = timeoutAfterCreditDelayMillis;
    }

    public VirtualPayeeBankController(
            VirtualPayeeBankService payeeBankService,
            ScenarioService scenarioService,
            long timeoutAfterCreditDelayMillis) {
        this(payeeBankService, scenarioService, new VirtualNetworkMetrics(),
                timeoutAfterCreditDelayMillis);
    }

    @PostMapping("/credit")
    public ResponseEntity<PayeeCreditResponse> credit(
            @RequestBody PayeeCreditRequest request) {

        metrics.recordPayeeCreditRequest();

        FailureScenario scenario =
                scenarioService.getCurrentScenario();

        if (scenario == FailureScenario.PAYEE_BANK_UNAVAILABLE) {
            metrics.recordSimulatedHttp503Response();
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .build();
        }

        if (scenario == FailureScenario.PAYEE_BANK_DECLINED) {
            metrics.recordDeclinedCredit();

            PayeeCreditResponse response = new PayeeCreditResponse(
                    request.transactionId(),
                    "FAILED",
                    "Payee bank declined the transaction",
                    null
            );

            return ResponseEntity.ok(response);
        }

        PayeeCreditResponse response =
                payeeBankService.credit(request);

        if (scenario == FailureScenario.PAYEE_TIMEOUT_AFTER_CREDIT
                && "SUCCESS".equals(response.status())) {
            metrics.recordSimulatedTimeout();
            delayResponse();
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/transactions/{transactionId}")
    public ResponseEntity<PayeeCreditResponse> transactionStatus(
            @PathVariable String transactionId) {
        metrics.recordPayeeStatusEnquiry();
        return payeeBankService.findProcessedTransaction(transactionId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void delayResponse() {
        try {
            TimeUnit.MILLISECONDS.sleep(timeoutAfterCreditDelayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
