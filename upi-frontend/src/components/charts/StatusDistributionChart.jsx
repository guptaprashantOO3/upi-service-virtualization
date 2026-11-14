import React from 'react'
import { Card, Progress, Row, Col, Typography, Space } from 'antd'
import { PAYMENT_STATUS_CONFIG } from '../../utils/constants'

const { Text } = Typography

export function StatusDistributionChart({ metrics, title = 'Payment Status Distribution' }) {
  if (!metrics) return null

  const success = Number(metrics.successfulPayments || 0)
  const pending = Number(metrics.pendingPayments || 0)
  const failed = Number(metrics.failedPayments || 0)
  const reversed = Number(metrics.reversedPayments || 0)
  const reversalPending = Number(metrics.reversalPendingPayments || 0)
  const inProgress = Number(metrics.inProgressPayments || 0)

  const total = success + pending + failed + reversed + reversalPending + inProgress
  const calcPercent = (val) => (total > 0 ? Math.round((val / total) * 100) : 0)

  const items = [
    {
      key: 'SUCCESS',
      label: 'Success',
      count: success,
      percent: calcPercent(success),
      color: PAYMENT_STATUS_CONFIG.SUCCESS.hex,
    },
    {
      key: 'PENDING',
      label: 'Pending (Timeout/Uncertain)',
      count: pending,
      percent: calcPercent(pending),
      color: PAYMENT_STATUS_CONFIG.PENDING.hex,
    },
    {
      key: 'FAILED',
      label: 'Failed',
      count: failed,
      percent: calcPercent(failed),
      color: PAYMENT_STATUS_CONFIG.FAILED.hex,
    },
    {
      key: 'REVERSED',
      label: 'Reversed to Payer',
      count: reversed,
      percent: calcPercent(reversed),
      color: PAYMENT_STATUS_CONFIG.REVERSED.hex,
    },
    {
      key: 'REVERSAL_PENDING',
      label: 'Reversal Pending',
      count: reversalPending,
      percent: calcPercent(reversalPending),
      color: PAYMENT_STATUS_CONFIG.REVERSAL_PENDING.hex,
    },
    {
      key: 'IN_PROGRESS',
      label: 'In Progress (Active Locks)',
      count: inProgress,
      percent: calcPercent(inProgress),
      color: PAYMENT_STATUS_CONFIG.PROCESSING.hex,
    },
  ]

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
            Total Resolved: <strong>{total}</strong>
          </Text>
        </div>
      }
      style={{ borderRadius: 8, height: '100%' }}
    >
      {/* Multi-segment stacked progress visual */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            height: 12,
            width: '100%',
            backgroundColor: '#f1f5f9',
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {items.map((item) =>
            item.percent > 0 ? (
              <div
                key={item.key}
                title={`${item.label}: ${item.count} (${item.percent}%)`}
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: item.color,
                  height: '100%',
                  transition: 'width 0.3s ease',
                }}
              />
            ) : null
          )}
        </div>
      </div>

      {/* Grid of statuses */}
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col xs={24} sm={12} key={item.key}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Space size={6}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: item.color,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: '#334155' }}>{item.label}</Text>
                </Space>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  {item.count}{' '}
                  <span style={{ fontSize: 12, fontWeight: 'normal', color: '#64748b' }}>
                    ({item.percent}%)
                  </span>
                </Text>
              </div>
              <Progress
                percent={item.percent}
                strokeColor={item.color}
                showInfo={false}
                size="small"
              />
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  )
}

