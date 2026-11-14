import { virtualNetworkApi, extractErrorMessage } from './api'

export const scenarioService = {
  /**
   * Fetch currently active failure scenario
   * GET /virtual/admin/scenario
   * Returns: { currentScenario: "NORMAL" }
   */
  async getCurrentScenario() {
    try {
      const response = await virtualNetworkApi.get('/admin/scenario')
      return { success: true, scenario: response.data.currentScenario }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },

  /**
   * Update active failure scenario
   * PUT /virtual/admin/scenario?scenario={scenario}
   * @param {string} scenario
   */
  async updateScenario(scenario) {
    try {
      const response = await virtualNetworkApi.put('/admin/scenario', null, {
        params: { scenario },
      })
      return {
        success: true,
        message: response.data.message,
        scenario: response.data.currentScenario,
      }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },

  /**
   * Reset scenario back to NORMAL
   * POST /virtual/admin/scenario/reset
   */
  async resetScenario() {
    try {
      const response = await virtualNetworkApi.post('/admin/scenario/reset')
      return {
        success: true,
        message: response.data.message,
        scenario: response.data.currentScenario,
      }
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
        status: error.response?.status,
      }
    }
  },
}

