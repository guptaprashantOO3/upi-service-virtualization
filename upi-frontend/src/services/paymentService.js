import { orchestratorApi, extractErrorMessage } from './api'

export const paymentService = {
  /**
   * Execute or replay a payment with idempotency key
   * POST /api/payments
   * @param {{ idempotencyKey: string, payerVpa: string, payeeVpa: string, amount: number }} payload
   */
  async createPayment(payload) {
    try {
      const response = await orchestratorApi.post('/payments', payload)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
        raw: error,
      }
    }
  },

  /**
   * Retrieve current status of a payment by transactionId
   * GET /api/payments/{transactionId}
   * @param {string} transactionId
   */
  async getPaymentStatus(transactionId) {
    try {
      const response = await orchestratorApi.get(`/payments/${encodeURIComponent(transactionId)}`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
        raw: error,
      }
    }
  },

  /**
   * Trigger explicit recovery for a PENDING transaction
   * POST /api/payments/{transactionId}/recover
   * @param {string} transactionId
   */
  async recoverPayment(transactionId) {
    try {
      const response = await orchestratorApi.post(
        `/payments/${encodeURIComponent(transactionId)}/recover`
      )
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
        raw: error,
      }
    }
  },

  /**
   * Developer network test route
   * POST /api/network-test/route
   */
  async testRoute() {
    try {
      const response = await orchestratorApi.post('/network-test/route')
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },
}

