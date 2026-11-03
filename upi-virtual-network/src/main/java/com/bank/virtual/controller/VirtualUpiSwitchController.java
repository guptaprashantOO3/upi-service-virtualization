
package com.bank.virtual.controller;

import com.bank.virtual.dto.SwitchRequest;
import com.bank.virtual.dto.SwitchResponse;
import com.bank.virtual.switchsimulator.VirtualUpiSwitchService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/virtual/switch")
public class VirtualUpiSwitchController {

    private final VirtualUpiSwitchService switchService;

    public VirtualUpiSwitchController(
            VirtualUpiSwitchService switchService) {
        this.switchService = switchService;
    }

    @PostMapping("/route")
    public SwitchResponse route(
            @RequestBody SwitchRequest request) {

        return switchService.route(request);
    }
}
