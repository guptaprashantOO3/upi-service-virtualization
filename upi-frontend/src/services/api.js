import axios from 'axios'

// Centralized Axios instance for Orchestrator (Port 8080 via /api proxy)
export const orchestratorApi = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Centralized Axios instance for Virtual Network (Port 8081 via /virtual proxy)
export const virtualNetworkApi = axios.create({
  baseURL: '/virtual',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to extract a friendly error message from Axios errors
export function extractErrorMessage(error) {
  if (error.response) {
    const data = error.response.data
    if (typeof data === 'string') {
      return data
    }
    if (data?.message) {
      return data.message
    }
    if (data?.error) {
      return `${data.error} (HTTP ${error.response.status})`
    }
    return `Server responded with status ${error.response.status}: ${error.response.statusText}`
  }
  if (error.request) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out waiting for the service to respond.'
    }
    return 'Cannot reach backend service. Please check if the Spring Boot application is running.'
  }
  return error.message || 'An unexpected error occurred.'
}

