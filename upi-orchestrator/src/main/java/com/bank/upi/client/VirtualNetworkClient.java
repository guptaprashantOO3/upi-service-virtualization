
package com.bank.upi.client;

import com.bank.upi.dto.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import com.bank.upi.dto.PayerDebitRequest;
import com.bank.upi.dto.PayerDebitResponse;
import com.bank.upi.dto.PayeeCreditRequest;
import com.bank.upi.dto.PayeeCreditResponse;
import com.bank.upi.dto.PayerReversalRequest;
import com.bank.upi.dto.PayerReversalResponse;

@Component
public class VirtualNetworkClient {

    private final RestClient restClient;

    public VirtualNetworkClient(RestClient virtualNetworkRestClient) {
        this.restClient = virtualNetworkRestClient;
    }

    public SwitchResponse routePayment(SwitchRequest request) {

        return restClient.post()
                .uri("/virtual/switch/route")
                .body(request)
                .retrieve()
                .body(SwitchResponse.class);
    }
    public PayerDebitResponse debitPayer(PayerDebitRequest request) {
        return restClient.post()
                .uri("/virtual/payer/debit")
                .body(request)
                .retrieve()
                .body(PayerDebitResponse.class);
    }

    public PayeeCreditResponse creditPayee(PayeeCreditRequest request) {
        return restClient.post()
                .uri("/virtual/payee/credit")
                .body(request)
                .retrieve()
                .body(PayeeCreditResponse.class);
    }
    public PayeeCreditResponse getPayeeCreditStatus(String transactionId) {
        try {
            return restClient.get()
                    .uri("/virtual/payee/transactions/{transactionId}", transactionId)
                    .retrieve()
                    .body(PayeeCreditResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound ignored) {
            return null;
        }
    }

    public PayerReversalResponse reversePayer(
            PayerReversalRequest request) {

        return restClient.post()
                .uri("/virtual/payer/reverse")
                .body(request)
                .retrieve()
                .body(PayerReversalResponse.class);
    }
}
