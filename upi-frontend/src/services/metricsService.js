import { orchestratorApi, virtualNetworkApi, extractErrorMessage } from './api'

export const metricsService = {
  /**
   * Fetch Orchestrator payment metrics
   * GET /api/metrics
   */
  async getOrchestratorMetrics() {
    try {
      const response = await orchestratorApi.get('/metrics')
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },

  /**
   * Fetch Virtual Network metrics
   * GET /virtual/admin/metrics
   */
  async getVirtualMetrics() {
    try {
      const response = await virtualNetworkApi.get('/admin/metrics')
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },

  /**
   * Check Virtual Network Health
   * GET /virtual/health
   */
  async getVirtualHealth() {
    try {
      const response = await virtualNetworkApi.get('/health')
      return {
        success: true,
        status: response.data?.status || 'UP',
        application: response.data?.application || 'Virtual UPI Network',
      }
    } catch (error) {
      return {
        success: false,
        status: 'DOWN',
        error: extractErrorMessage(error),
      }
    }
  },

  /**
   * Check Orchestrator Health by probing /api/metrics
   */
  async getOrchestratorHealth() {
    try {
      await orchestratorApi.get('/metrics')
      return {
        success: true,
        status: 'UP',
        application: 'UPI Payment Orchestrator',
      }
    } catch (error) {
      return {
        success: false,
        status: 'DOWN',
        error: extractErrorMessage(error),
      }
    }
  },

  /**
   * Direct enquiry of virtual payee bank for a specific transaction
   * GET /virtual/payee/transactions/{transactionId}
   * @param {string} transactionId
   */
  async getPayeeTransactionStatus(transactionId) {
    try {
      const response = await virtualNetworkApi.get(
        `/payee/transactions/${encodeURIComponent(transactionId)}`
      )
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

