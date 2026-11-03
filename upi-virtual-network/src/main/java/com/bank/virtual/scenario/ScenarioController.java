package com.bank.virtual.scenario;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/virtual/admin/scenario")
public class ScenarioController {

    private final ScenarioService scenarioService;

    public ScenarioController(ScenarioService scenarioService) {
        this.scenarioService = scenarioService;
    }

    @GetMapping
    public Map<String, String> getCurrentScenario() {

        return Map.of(
                "currentScenario",
                scenarioService.getCurrentScenario().name()
        );
    }

    @PutMapping
    public Map<String, String> updateScenario(
            @RequestParam FailureScenario scenario) {

        scenarioService.setCurrentScenario(scenario);

        return Map.of(
                "message", "Scenario updated successfully",
                "currentScenario", scenarioService.getCurrentScenario().name()
        );
    }

    @PostMapping("/reset")
    public Map<String, String> resetScenario() {

        scenarioService.resetScenario();

        return Map.of(
                "message", "Scenario reset successfully",
                "currentScenario", scenarioService.getCurrentScenario().name()
        );
    }
}