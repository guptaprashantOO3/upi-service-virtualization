package com.bank.virtual.scenario;

import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicReference;

@Service
public class ScenarioService {

    private final AtomicReference<FailureScenario> currentScenario =
            new AtomicReference<>(FailureScenario.NORMAL);

    public FailureScenario getCurrentScenario() {
        return currentScenario.get();
    }

    public void setCurrentScenario(FailureScenario scenario) {
        if (scenario == null) {
            throw new IllegalArgumentException("Scenario cannot be null");
        }

        currentScenario.set(scenario);
    }

    public void resetScenario() {
        currentScenario.set(FailureScenario.NORMAL);
    }
}