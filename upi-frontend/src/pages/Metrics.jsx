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
  Switch,
  Tag,
  Divider,
  Progress,
} from 'antd'
import {
  ReloadOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RollbackOutlined,
  FieldTimeOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { metricsService } from '../services/metricsService'
import { formatLatency } from '../utils/formatters'
import { PAYMENT_STATUS_CONFIG } from '../utils/constants'

const { Title, Text, Paragraph } = Typography

export function Metrics() {
  const [orchestratorMetrics, setOrchestratorMetrics] = useState(null)
  const [virtualMetrics, setVirtualMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAllMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [orchRes, virtRes] = await Promise.all([
      metricsService.getOrchestratorMetrics(),
      metricsService.getVirtualMetrics(),
    ])

    let hasError = false
    const errMessages = []

    if (orchRes.success) {
      setOrchestratorMetrics(orchRes.data)
    } else {
      hasError = true
      errMessages.push(`Orchestrator (:8080): ${orchRes.error}`)
    }

    if (virtRes.success) {
      setVirtualMetrics(virtRes.data)
    } else {
      hasError = true
      errMessages.push(`Virtual Network (:8081): ${virtRes.error}`)
    }

    if (hasError) {
      setError(errMessages.join(' | '))
    }

    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllMetrics()
  }, [fetchAllMetrics])

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchAllMetrics, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchAllMetrics])

  // Prepare table data for Orchestrator metrics
  const orchestratorTableData = orchestratorMetrics
    ? Object.entries(orchestratorMetrics).map(([key, val]) => ({
        key,
        metric: key,
        value: val,
        formatted: key.includes('Nanos') ? formatLatency(val) : val.toLocaleString(),
      }))
    : []

  // Prepare table data for Virtual Network metrics
  const virtualTableData = virtualMetrics
    ? Object.entries(virtualMetrics).map(([key, val]) => ({
        key,
        metric: key,
        value: val,
        formatted: val.toLocaleString(),
      }))
    : []

  const tableColumns = [
    {
      title: 'Metric Name (Backend Property)',
      dataIndex: 'metric',
      key: 'metric',
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Value',
      dataIndex: 'formatted',
      key: 'formatted',
      render: (val, record) => (
        <Text strong style={{ color: record.value > 0 ? '#0f172a' : '#94a3b8' }}>
          {val}
        </Text>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            System-Wide Telemetry & In-Memory Metrics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Aggregating real metrics from both <code>/api/metrics</code> and <code>/virtual/admin/metrics</code>
          </Text>
        </div>

        <Space size="middle">
          <Space size={6}>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              size="small"
            />
            <Text style={{ fontSize: 13, color: '#475569' }}>
              Auto-refresh (5s)
            </Text>
          </Space>

          {lastUpdated && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}

          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchAllMetrics}
            loading={loading}
          >
            Refresh Metrics
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          type="warning"
          showIcon
          message="One or More Metrics Endpoints Unavailable"
          description={error}
        />
      )}

      {/* Section 1: Orchestrator Performance & Latency */}
      <div>
        <Divider orientation="left" style={{ margin: '8px 0 16px 0', fontSize: 15, color: '#1677ff' }}>
          <Space>
            <BarChartOutlined />
            <span>UPI Orchestrator Metrics (:8080)</span>
          </Space>
        </Divider>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>TOTAL REQUESTS</Text>}
                value={orchestratorMetrics?.totalPaymentRequests ?? 0}
                valueStyle={{ fontWeight: 700, color: '#1677ff' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                totalPaymentRequests
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>AVG PROCESSING TIME</Text>}
                value={
                  orchestratorMetrics?.averagePaymentProcessingLatencyNanos
                    ? formatLatency(orchestratorMetrics.averagePaymentProcessingLatencyNanos)
                    : '0.00 ms'
                }
                valueStyle={{ fontWeight: 700, color: '#0284c7' }}
                prefix={<FieldTimeOutlined style={{ fontSize: 18 }} />}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                averagePaymentProcessingLatencyNanos
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>IDEMPOTENCY DUPLICATES</Text>}
                value={orchestratorMetrics?.duplicateIdempotencyRequests ?? 0}
                valueStyle={{ fontWeight: 700, color: '#8b5cf6' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                duplicateIdempotencyRequests
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>PAYEE TIMEOUTS</Text>}
                value={orchestratorMetrics?.payeeTimeoutOccurrences ?? 0}
                valueStyle={{ fontWeight: 700, color: '#f59e0b' }}
                prefix={<ClockCircleOutlined style={{ fontSize: 18 }} />}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                payeeTimeoutOccurrences
              </Text>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Section 2: Virtual Bank Core Operations */}
      <div>
        <Divider orientation="left" style={{ margin: '8px 0 16px 0', fontSize: 15, color: '#0d9488' }}>
          <Space>
            <BankOutlined />
            <span>Virtual Banking Network Metrics (:8081)</span>
          </Space>
        </Divider>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>TOTAL BANK REQUESTS</Text>}
                value={virtualMetrics?.totalVirtualBankRequests ?? 0}
                valueStyle={{ fontWeight: 700, color: '#0d9488' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                totalVirtualBankRequests
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>PAYER DEBITS</Text>}
                value={virtualMetrics?.payerDebitRequests ?? 0}
                valueStyle={{ fontWeight: 700, color: '#0284c7' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                payerDebitRequests
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>PAYEE CREDITS</Text>}
                value={virtualMetrics?.payeeCreditRequests ?? 0}
                valueStyle={{ fontWeight: 700, color: '#10b981' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                payeeCreditRequests
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>SIMULATED 503 RESPONSES</Text>}
                value={virtualMetrics?.simulatedHttp503Responses ?? 0}
                valueStyle={{ fontWeight: 700, color: '#ef4444' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                simulatedHttp503Responses
              </Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>SUCCESSFUL CREDITS</Text>}
                value={virtualMetrics?.successfulCredits ?? 0}
                valueStyle={{ fontWeight: 700, color: '#16a34a' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                successfulCredits
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>DECLINED CREDITS</Text>}
                value={virtualMetrics?.declinedCredits ?? 0}
                valueStyle={{ fontWeight: 700, color: '#dc2626' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                declinedCredits
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>PAYER REVERSALS</Text>}
                value={virtualMetrics?.payerReversals ?? 0}
                valueStyle={{ fontWeight: 700, color: '#9333ea' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                payerReversals
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748b' }}>STATUS ENQUIRIES</Text>}
                value={virtualMetrics?.payeeStatusEnquiries ?? 0}
                valueStyle={{ fontWeight: 700, color: '#2563eb' }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                payeeStatusEnquiries
              </Text>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Section 3: Detailed Raw Metrics Breakdown Tables */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title="Orchestrator Metric Snapshot (/api/metrics)"
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={orchestratorTableData}
              columns={tableColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Virtual Network Metric Snapshot (/virtual/admin/metrics)"
            size="small"
            style={{ borderRadius: 8 }}
          >
            <Table
              dataSource={virtualTableData}
              columns={tableColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
