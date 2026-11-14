import { useState, useEffect, useCallback } from 'react'
import { TransactionContext } from './TransactionContextObject'
import { paymentService } from '../services/paymentService'
import { scenarioService } from '../services/scenarioService'

const STORAGE_KEY = 'upi_platform_session_transactions'

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [activeScenario, setActiveScenario] = useState('NORMAL')
  const [scenarioLoading, setScenarioLoading] = useState(false)

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    } catch {
      // storage unavailable or full
    }
  }, [transactions])

  // Fetch current scenario from virtual network
  const refreshScenario = useCallback(async () => {
    setScenarioLoading(true)
    const result = await scenarioService.getCurrentScenario()
    if (result.success && result.scenario) {
      setActiveScenario(result.scenario)
    }
    setScenarioLoading(false)
    return result
  }, [])

  useEffect(() => {
    refreshScenario()
  }, [refreshScenario])

  /**
   * Add or update transaction record
   */
  const recordTransaction = useCallback((txData) => {
    if (!txData || !txData.transactionId) return

    setTransactions((prev) => {
      const existingIndex = prev.findIndex((t) => t.transactionId === txData.transactionId)
      const now = new Date().toISOString()
      const normalized = {
        transactionId: txData.transactionId,
        idempotencyKey: txData.idempotencyKey || prev[existingIndex]?.idempotencyKey || '—',
        payerVpa: txData.payerVpa || prev[existingIndex]?.payerVpa || 'alice@demo',
        payeeVpa: txData.payeeVpa || prev[existingIndex]?.payeeVpa || 'bob@demo',
        amount: txData.amount !== undefined ? txData.amount : prev[existingIndex]?.amount || 0,
        status: txData.status || prev[existingIndex]?.status || 'UNKNOWN',
        message: txData.message || prev[existingIndex]?.message || '',
        createdAt: prev[existingIndex]?.createdAt || now,
        updatedAt: now,
      }

      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = normalized
        return next
      } else {
        return [normalized, ...prev].slice(0, 50) // keep latest 50
      }
    })
  }, [])

  /**
   * Sync a transaction with the backend status
   */
  const syncTransactionStatus = useCallback(
    async (transactionId) => {
      const result = await paymentService.getPaymentStatus(transactionId)
      if (result.success && result.data) {
        recordTransaction(result.data)
        return { success: true, data: result.data }
      }
      return result
    },
    [recordTransaction]
  )

  /**
   * Clear session transaction cache
   */
  const clearSessionHistory = useCallback(() => {
    setTransactions([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        recordTransaction,
        syncTransactionStatus,
        clearSessionHistory,
        activeScenario,
        setActiveScenario,
        refreshScenario,
        scenarioLoading,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}
