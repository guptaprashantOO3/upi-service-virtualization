package com.bank.virtual.scenario;

public enum FailureScenario {

    NORMAL,
    PAYER_BANK_UNAVAILABLE,
    PAYEE_BANK_DECLINED,
    PAYEE_TIMEOUT_AFTER_CREDIT,
    PAYEE_BANK_UNAVAILABLE
}