
package com.bank.virtual.controller;

import com.bank.virtual.dto.PayerDebitRequest;
import com.bank.virtual.dto.PayerDebitResponse;
import com.bank.virtual.dto.PayerReversalRequest;
import com.bank.virtual.dto.PayerReversalResponse;
import com.bank.virtual.payerbank.VirtualPayerBankService;
import com.bank.virtual.metrics.VirtualNetworkMetrics;
import com.bank.virtual.scenario.ScenarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.bank.virtual.scenario.FailureScenario;

@RestController
@RequestMapping("/virtual/payer")
public class VirtualPayerBankController {
    private final ScenarioService scenarioService;
    private final VirtualPayerBankService payerBankService;
    private final VirtualNetworkMetrics metrics;

    @Autowired
    public VirtualPayerBankController(
            VirtualPayerBankService payerBankService,
            ScenarioService scenarioService,
            VirtualNetworkMetrics metrics) {

        this.payerBankService = payerBankService;
        this.scenarioService = scenarioService;
        this.metrics = metrics;
    }

    @PostMapping("/debit")
    public ResponseEntity<PayerDebitResponse> debit(
            @RequestBody PayerDebitRequest request) {

        metrics.recordPayerDebitRequest();

        if (scenarioService.getCurrentScenario()
                == FailureScenario.PAYER_BANK_UNAVAILABLE) {

            metrics.recordSimulatedHttp503Response();

            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .build();
        }

        PayerDebitResponse response = payerBankService.debit(request);

        return ResponseEntity.ok(response);
    }
    @PostMapping("/reverse")
    public PayerReversalResponse reverse(
            @RequestBody PayerReversalRequest request) {

        metrics.recordPayerReversal();
        return payerBankService.reverse(request);
    }
}
