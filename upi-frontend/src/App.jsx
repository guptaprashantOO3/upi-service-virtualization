import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import { TransactionProvider } from './context/TransactionContext'
import { AppLayout } from './components/layout/AppLayout'

// Lazy-loaded pages for clean bundle splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const MakePayment = lazy(() => import('./pages/MakePayment').then((m) => ({ default: m.MakePayment })))
const Transactions = lazy(() => import('./pages/Transactions').then((m) => ({ default: m.Transactions })))
const FailureSimulation = lazy(() =>
  import('./pages/FailureSimulation').then((m) => ({ default: m.FailureSimulation }))
)
const Recovery = lazy(() => import('./pages/Recovery').then((m) => ({ default: m.Recovery })))
const Metrics = lazy(() => import('./pages/Metrics').then((m) => ({ default: m.Metrics })))

const PageLoader = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" tip="Loading Page..." />
  </div>
)

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1677ff',
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Card: {
            headerFontSize: 15,
            headerHeight: 48,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f1f5f9',
          },
          Menu: {
            darkItemBg: '#0a192f',
            darkSubMenuItemBg: '#071324',
            darkItemSelectedBg: '#1677ff',
            darkItemColor: '#94a3b8',
            darkItemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <TransactionProvider>
        <BrowserRouter>
          <Suspense fallback={PageLoader}>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="make-payment" element={<MakePayment />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="failure-simulation" element={<FailureSimulation />} />
                <Route path="recovery" element={<Recovery />} />
                <Route path="metrics" element={<Metrics />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TransactionProvider>
    </ConfigProvider>
  )
}

export default App
