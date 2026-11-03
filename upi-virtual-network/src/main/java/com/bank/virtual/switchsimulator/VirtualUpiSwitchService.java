
package com.bank.virtual.switchsimulator;

import com.bank.virtual.dto.SwitchRequest;
import com.bank.virtual.dto.SwitchResponse;
import org.springframework.stereotype.Service;

@Service
public class VirtualUpiSwitchService {

    public SwitchResponse route(SwitchRequest request) {

        if (request.payeeVpa() == null ||
                !request.payeeVpa().contains("@")) {

            return new SwitchResponse(
                    request.transactionId(),
                    "FAILED",
                    "Invalid beneficiary VPA",
                    null
            );
        }

        String destinationBank =
                request.payeeVpa()
                        .substring(request.payeeVpa().indexOf("@") + 1);

        return new SwitchResponse(
                request.transactionId(),
                "SUCCESS",
                "Payment route identified successfully",
                destinationBank
        );
    }
}
