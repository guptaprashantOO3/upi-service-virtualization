// E2E Verification Script for UPI Platform through Vite Proxy (Port 5173)
const BASE_URL = 'http://localhost:5173'

async function runTests() {
  console.log('====================================================')
  console.log('Starting UPI Service Virtualization E2E Test Suite')
  console.log(`Target: Vite Dev Server Proxy at ${BASE_URL}`)
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  // 1. Health Checks
  console.log('1. Testing System Health & Vite Proxy Routing...')
  try {
    const orchRes = await fetch(`${BASE_URL}/api/metrics`)
    assert(orchRes.ok, `GET /api/metrics returned HTTP ${orchRes.status}`)
    const orchData = await orchRes.json()
    assert(orchData.totalPaymentRequests !== undefined, 'Orchestrator returned metrics payload')

    const virtRes = await fetch(`${BASE_URL}/virtual/health`)
    assert(virtRes.ok, `GET /virtual/health returned HTTP ${virtRes.status}`)
    const virtData = await virtRes.json()
    assert(virtData.status === 'UP', `Virtual Network health status is UP (${virtData.application})`)
  } catch (err) {
    console.error('Health check failed:', err.message)
    failed++
  }

  // 2. Normal Payment & Idempotency Key Replay
  console.log('\n2. Testing Make Payment (NORMAL Scenario)...')
  let normalTxId = null
  const normalIdempKey = `TEST-IDEMP-${Date.now()}`
  try {
    // Reset scenario to NORMAL first
    await fetch(`${BASE_URL}/virtual/admin/scenario/reset`, { method: 'POST' })

    const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: normalIdempKey,
        payerVpa: 'alice@demo',
        payeeVpa: 'bob@demo',
        amount: 1000.0,
      }),
    })

    assert(paymentRes.ok, `POST /api/payments returned HTTP ${paymentRes.status}`)
    const paymentData = await paymentRes.json()
    normalTxId = paymentData.transactionId
    assert(paymentData.status === 'SUCCESS', `Payment outcome is SUCCESS (Message: "${paymentData.message}")`)
    assert(normalTxId && normalTxId.startsWith('TXN-'), `Assigned Transaction ID: ${normalTxId}`)

    // Test Idempotency Replay
    console.log('\n2b. Testing Idempotency Replay (Duplicate Key)...')
    const replayRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: normalIdempKey,
        payerVpa: 'alice@demo',
        payeeVpa: 'bob@demo',
        amount: 1000.0,
      }),
    })
    assert(replayRes.ok, `Replay request returned HTTP ${replayRes.status}`)
    const replayData = await replayRes.json()
    assert(replayData.transactionId === normalTxId, 'Replay returned identical Transaction ID')
    assert(replayData.status === 'SUCCESS', 'Replay preserved existing SUCCESS status')
  } catch (err) {
    console.error('Make Payment test failed:', err.message)
    failed++
  }

  // 3. Transactions Lookup by ID
  console.log('\n3. Testing Transaction Lookup by ID...')
  try {
    const lookupRes = await fetch(`${BASE_URL}/api/payments/${normalTxId}`)
    assert(lookupRes.ok, `GET /api/payments/${normalTxId} returned HTTP ${lookupRes.status}`)
    const lookupData = await lookupRes.json()
    assert(lookupData.transactionId === normalTxId, `Transaction ID matched: ${lookupData.transactionId}`)
    assert(lookupData.amount === 1000.0, `Amount matched: ₹ ${lookupData.amount}`)
    assert(lookupData.status === 'SUCCESS', `Status matched: ${lookupData.status}`)
  } catch (err) {
    console.error('Transaction lookup failed:', err.message)
    failed++
  }

  // 4. Failure Simulation & Recovery (PAYEE_TIMEOUT_AFTER_CREDIT)
  console.log('\n4. Testing Failure Injection & Payment Recovery (PAYEE_TIMEOUT_AFTER_CREDIT)...')
  let timeoutTxId = null
  try {
    // 4a. Apply Scenario
    const setScenarioRes = await fetch(
      `${BASE_URL}/virtual/admin/scenario?scenario=PAYEE_TIMEOUT_AFTER_CREDIT`,
      { method: 'PUT' }
    )
    assert(setScenarioRes.ok, 'PUT /virtual/admin/scenario?scenario=PAYEE_TIMEOUT_AFTER_CREDIT succeeded')
    const setScenarioData = await setScenarioRes.json()
    assert(
      setScenarioData.currentScenario === 'PAYEE_TIMEOUT_AFTER_CREDIT',
      `Active scenario confirmed: ${setScenarioData.currentScenario}`
    )

    // 4b. Execute Payment expected to time out
    const timeoutIdempKey = `TIMEOUT-IDEMP-${Date.now()}`
    console.log('  Executing payment under timeout scenario (waiting ~1-2s for orchestrator timeout)...')
    const timeoutPaymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: timeoutIdempKey,
        payerVpa: 'alice@demo',
        payeeVpa: 'bob@demo',
        amount: 2500.0,
      }),
    })
    assert(timeoutPaymentRes.ok, `POST /api/payments returned HTTP ${timeoutPaymentRes.status}`)
    const timeoutPaymentData = await timeoutPaymentRes.json()
    timeoutTxId = timeoutPaymentData.transactionId
    assert(
      timeoutPaymentData.status === 'PENDING',
      `Payment correctly marked PENDING after read-timeout (Outcome: "${timeoutPaymentData.message}")`
    )

    // 4c. Verify Payee Bank Committed Credit Directly
    const payeeCheckRes = await fetch(`${BASE_URL}/virtual/payee/transactions/${timeoutTxId}`)
    assert(payeeCheckRes.ok, `GET /virtual/payee/transactions/${timeoutTxId} confirmed credit committed at payee bank`)
    const payeeCheckData = await payeeCheckRes.json()
    assert(payeeCheckData.status === 'SUCCESS', `Payee bank record status is SUCCESS`)

    // 4d. Trigger Payment Recovery on Orchestrator
    console.log('  Triggering recovery via POST /api/payments/{transactionId}/recover...')
    const recoverRes = await fetch(`${BASE_URL}/api/payments/${timeoutTxId}/recover`, {
      method: 'POST',
    })
    assert(recoverRes.ok, `POST /api/payments/${timeoutTxId}/recover returned HTTP ${recoverRes.status}`)
    const recoverData = await recoverRes.json()
    assert(
      recoverData.status === 'SUCCESS',
      `Payment successfully recovered to SUCCESS (Message: "${recoverData.message}")`
    )

    // 4e. Verify payment status is now permanently SUCCESS on orchestrator
    const finalStatusRes = await fetch(`${BASE_URL}/api/payments/${timeoutTxId}`)
    const finalStatusData = await finalStatusRes.json()
    assert(finalStatusData.status === 'SUCCESS', 'Subsequent enquiry confirmed transaction is now SUCCESS')

    // Reset Scenario
    await fetch(`${BASE_URL}/virtual/admin/scenario/reset`, { method: 'POST' })
    console.log('  Scenario reset back to NORMAL.')
  } catch (err) {
    console.error('Timeout and recovery test failed:', err.message)
    failed++
  }

  // 5. Test PAYEE_BANK_DECLINED Scenario (Reversal test)
  console.log('\n5. Testing Payee Decline & Automated Reversal (PAYEE_BANK_DECLINED)...')
  try {
    await fetch(`${BASE_URL}/virtual/admin/scenario?scenario=PAYEE_BANK_DECLINED`, { method: 'PUT' })

    const declinePaymentRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: `DECLINE-IDEMP-${Date.now()}`,
        payerVpa: 'alice@demo',
        payeeVpa: 'bob@demo',
        amount: 300.0,
      }),
    })
    assert(declinePaymentRes.ok, `POST /api/payments returned HTTP ${declinePaymentRes.status}`)
    const declineData = await declinePaymentRes.json()
    assert(
      declineData.status === 'REVERSED',
      `Orchestrator successfully executed automatic reversal: Status=${declineData.status} (Message: "${declineData.message}")`
    )

    // Reset Scenario
    await fetch(`${BASE_URL}/virtual/admin/scenario/reset`, { method: 'POST' })
    console.log('  Scenario reset back to NORMAL.')
  } catch (err) {
    console.error('Decline test failed:', err.message)
    failed++
  }

  // 6. Metrics Verification
  console.log('\n6. Verifying Telemetry & Metrics...')
  try {
    const orchMetricsRes = await fetch(`${BASE_URL}/api/metrics`)
    const orchMetrics = await orchMetricsRes.json()

    assert(orchMetrics.totalPaymentRequests >= 3, `totalPaymentRequests is ${orchMetrics.totalPaymentRequests}`)
    assert(orchMetrics.successfulPayments >= 2, `successfulPayments is ${orchMetrics.successfulPayments}`)
    assert(orchMetrics.reversedPayments >= 1, `reversedPayments is ${orchMetrics.reversedPayments}`)
    assert(orchMetrics.duplicateIdempotencyRequests >= 1, `duplicateIdempotencyRequests is ${orchMetrics.duplicateIdempotencyRequests}`)
    assert(orchMetrics.payeeTimeoutOccurrences >= 1, `payeeTimeoutOccurrences is ${orchMetrics.payeeTimeoutOccurrences}`)

    const virtMetricsRes = await fetch(`${BASE_URL}/virtual/admin/metrics`)
    const virtMetrics = await virtMetricsRes.json()
    assert(virtMetrics.totalVirtualBankRequests >= 3, `totalVirtualBankRequests is ${virtMetrics.totalVirtualBankRequests}`)
    assert(virtMetrics.payerDebitRequests >= 3, `payerDebitRequests is ${virtMetrics.payerDebitRequests}`)
    assert(virtMetrics.payerReversals >= 1, `payerReversals is ${virtMetrics.payerReversals}`)
    assert(virtMetrics.simulatedTimeouts >= 1, `simulatedTimeouts is ${virtMetrics.simulatedTimeouts}`)
    assert(virtMetrics.declinedCredits >= 1, `declinedCredits is ${virtMetrics.declinedCredits}`)
  } catch (err) {
    console.error('Metrics verification failed:', err.message)
    failed++
  }

  console.log('\n====================================================')
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()

