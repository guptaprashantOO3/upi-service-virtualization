
package com.bank.upi.controller;

import com.bank.upi.client.VirtualNetworkClient;
import com.bank.upi.dto.SwitchRequest;
import com.bank.upi.dto.SwitchResponse;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/network-test")
public class NetworkTestController {

    private final VirtualNetworkClient networkClient;

    public NetworkTestController(VirtualNetworkClient networkClient) {
        this.networkClient = networkClient;
    }

    @PostMapping("/route")
    public SwitchResponse testRoute() {

        SwitchRequest request = new SwitchRequest(
                "TXN-1001",
                "alice@demo",
                "bob@demo",
                new BigDecimal("1000.00")
        );

        return networkClient.routePayment(request);
    }
}
