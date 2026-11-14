import React, { useState, useEffect, useCallback } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Button,
  Space,
  Typography,
  Alert,
  Tooltip,
  Tag,
  Empty,
  Spin,
} from 'antd'
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  SendOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SyncOutlined,
  TransactionOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { metricsService } from '../services/metricsService'
import { useTransactions } from '../hooks/useTransactions'
import { HealthIndicator } from '../components/common/HealthIndicator'
import { StatusBadge } from '../components/common/StatusBadge'
import { StatusDistributionChart } from '../components/charts/StatusDistributionChart'
import { TransactionDetailModal } from '../components/common/TransactionDetailModal'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { PAYMENT_STATUS_CONFIG } from '../utils/constants'

const { Title, Text, Paragraph } = Typography

export function Dashboard() {
  const navigate = useNavigate()
  const { transactions, refreshScenario } = useTransactions()

  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTx, setSelectedTx] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await metricsService.getOrchestratorMetrics()
    if (result.success) {
      setMetrics(result.data)
    } else {
      setError(result.error)
    }
    await refreshScenario()
    setLoading(false)
  }, [refreshScenario])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const handleViewDetails = (record) => {
    setSelectedTx(record)
    setModalVisible(true)
  }

  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (text) => (
        <Text code strong style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Payer VPA',
      dataIndex: 'payerVpa',
      key: 'payerVpa',
      render: (text) => text || 'alice@demo',
    },
    {
      title: 'Payee VPA',
      dataIndex: 'payeeVpa',
      key: 'payeeVpa',
      render: (text) => text || 'bob@demo',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: '#0f172a' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusBadge status={status} size="small" />,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(date)}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner & Health Indicator */}
      <HealthIndicator />

      {/* Backend connection warning if metrics couldn't be loaded */}
      {error && (
        <Alert
          type="error"
          showIcon
          message="Cannot Connect to Payment Orchestrator (Port 8080)"
          description={
            <div>
              <p>{error}</p>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Make sure the Spring Boot orchestrator is running:{' '}
                <code>cd upi-orchestrator && ./mvnw spring-boot:run</code>
              </Text>
              <div style={{ marginTop: 8 }}>
                <Button size="small" icon={<ReloadOutlined />} onClick={fetchMetrics}>
                  Retry Connection
                </Button>
              </div>
            </div>
          }
        />
      )}

      {/* Primary KPI Metric Cards */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            System Overview & Metrics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Live in-memory counters & gauges from <code>/api/metrics</code>
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchMetrics}
            loading={loading}
          >
            Refresh Metrics
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => navigate('/make-payment')}
          >
            Make Payment
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Total Payment Requests */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: '4px solid #1677ff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  TOTAL REQUESTS
                </Text>
              }
              value={metrics?.totalPaymentRequests ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: '#0f172a' }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              All submitted payment calls
            </Text>
          </Card>
        </Col>

        {/* Unique Transactions */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: '4px solid #0284c7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  TRANSACTIONS
                </Text>
              }
              value={metrics?.uniqueTransactions ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: '#0284c7' }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Unique idempotency keys
            </Text>
          </Card>
        </Col>

        {/* Successful Payments */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: `4px solid ${PAYMENT_STATUS_CONFIG.SUCCESS.hex}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  SUCCESSFUL
                </Text>
              }
              value={metrics?.successfulPayments ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: PAYMENT_STATUS_CONFIG.SUCCESS.hex }}
              prefix={<CheckCircleOutlined style={{ fontSize: 18 }} />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Committed end-to-end
            </Text>
          </Card>
        </Col>

        {/* Pending Payments */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: `4px solid ${PAYMENT_STATUS_CONFIG.PENDING.hex}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  PENDING / TIMEOUT
                </Text>
              }
              value={metrics?.pendingPayments ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: PAYMENT_STATUS_CONFIG.PENDING.hex }}
              prefix={<ClockCircleOutlined style={{ fontSize: 18 }} />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Awaiting payee recovery
            </Text>
          </Card>
        </Col>

        {/* Failed Payments */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: `4px solid ${PAYMENT_STATUS_CONFIG.FAILED.hex}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  FAILED
                </Text>
              }
              value={metrics?.failedPayments ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: PAYMENT_STATUS_CONFIG.FAILED.hex }}
              prefix={<CloseCircleOutlined style={{ fontSize: 18 }} />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Rejected before debit
            </Text>
          </Card>
        </Col>

        {/* Reversed Payments */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: `4px solid ${PAYMENT_STATUS_CONFIG.REVERSED.hex}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Statistic
              title={
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  REVERSED
                </Text>
              }
              value={metrics?.reversedPayments ?? 0}
              loading={loading && !metrics}
              valueStyle={{ fontWeight: 700, color: PAYMENT_STATUS_CONFIG.REVERSED.hex }}
              prefix={<RollbackOutlined style={{ fontSize: 18 }} />}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Debited & refunded
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Middle row: Status Distribution Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <StatusDistributionChart metrics={metrics} />
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Resilience & Idempotency"
            style={{ borderRadius: 8, height: '100%' }}
          >
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 13, color: '#334155' }}>
                    Duplicate Key Requests
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    Replayed with matching key
                  </Text>
                </div>
                <Tag color="cyan" style={{ fontSize: 14, padding: '2px 8px' }}>
                  {metrics?.duplicateIdempotencyRequests ?? 0}
                </Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 13, color: '#334155' }}>
                    Payee Timeout Occurrences
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    Exceeded read-timeout (1000ms)
                  </Text>
                </div>
                <Tag color="volcano" style={{ fontSize: 14, padding: '2px 8px' }}>
                  {metrics?.payeeTimeoutOccurrences ?? 0}
                </Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 13, color: '#334155' }}>
                    Reversal Pending
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    Reversal communication failed
                  </Text>
                </div>
                <Tag color="magenta" style={{ fontSize: 14, padding: '2px 8px' }}>
                  {metrics?.reversalPendingPayments ?? 0}
                </Tag>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 13, color: '#334155' }}>
                    In-Progress (Locked)
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    Active orchestrator execution
                  </Text>
                </div>
                <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                  {metrics?.inProgressPayments ?? 0}
                </Tag>
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  backgroundColor: '#f8fafc',
                  borderRadius: 6,
                  border: '1px solid #f1f5f9',
                }}
              >
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  Avg Latency:{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {metrics?.averagePaymentProcessingLatencyNanos
                      ? `${(Number(metrics.averagePaymentProcessingLatencyNanos) / 1_000_000).toFixed(2)} ms`
                      : '0.00 ms'}
                  </strong>
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Bottom section: Recent Transactions Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size={8}>
              <TransactionOutlined style={{ color: '#1677ff' }} />
              <span>Recent Transactions (Current Session)</span>
            </Space>
            <Button
              type="link"
              onClick={() => navigate('/transactions')}
              style={{ fontSize: 13 }}
            >
              Go to Transactions &rarr;
            </Button>
          </div>
        }
        style={{ borderRadius: 8 }}
      >
        {transactions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No transactions executed in this session yet."
          >
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => navigate('/make-payment')}
            >
              Create Your First Payment
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={transactions.slice(0, 5)}
            columns={columns}
            rowKey="transactionId"
            pagination={false}
            size="middle"
          />
        )}
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTx}
        onClose={() => setModalVisible(false)}
        onUpdated={(updated) => {
          setSelectedTx(updated)
          fetchMetrics()
        }}
      />
    </div>
  )
}
