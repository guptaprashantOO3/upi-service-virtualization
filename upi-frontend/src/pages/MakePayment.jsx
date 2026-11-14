import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Descriptions,
  Tag,
  Tooltip,
  message,
} from 'antd'
import {
  SendOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { paymentService } from '../services/paymentService'
import { useTransactions } from '../hooks/useTransactions'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatCurrency, generateIdempotencyKey } from '../utils/formatters'
import { DEMO_VPA, FAILURE_SCENARIOS } from '../utils/constants'

const { Title, Text, Paragraph } = Typography

export function MakePayment() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { recordTransaction, activeScenario, refreshScenario } = useTransactions()

  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState(null)

  useEffect(() => {
    refreshScenario()
    // Pre-populate with realistic defaults
    form.setFieldsValue({
      payerVpa: DEMO_VPA.PAYER,
      payeeVpa: DEMO_VPA.PAYEE,
      amount: DEMO_VPA.DEFAULT_AMOUNT,
      idempotencyKey: generateIdempotencyKey(),
    })
  }, [form, refreshScenario])

  const handleGenerateKey = () => {
    const newKey = generateIdempotencyKey()
    form.setFieldsValue({ idempotencyKey: newKey })
    message.info('New idempotency key generated')
  }

  const handleSubmit = async (values) => {
    setLoading(true)
    setApiError(null)
    setPaymentResult(null)

    const payload = {
      idempotencyKey: values.idempotencyKey.trim(),
      payerVpa: values.payerVpa.trim(),
      payeeVpa: values.payeeVpa.trim(),
      amount: Number(values.amount),
    }

    setLastSubmittedPayload(payload)

    const result = await paymentService.createPayment(payload)
    setLoading(false)

    if (result.success && result.data) {
      setPaymentResult(result.data)
      // Save in context session history
      recordTransaction({
        ...result.data,
        idempotencyKey: payload.idempotencyKey,
        payerVpa: payload.payerVpa,
        payeeVpa: payload.payeeVpa,
      })

      if (result.data.status === 'SUCCESS') {
        message.success('Payment completed successfully!')
      } else if (result.data.status === 'PENDING') {
        message.warning('Payment is PENDING (timeout or uncertain debit)')
      } else if (result.data.status === 'REVERSED') {
        message.info('Payment declined and debited funds were reversed')
      } else {
        message.error(`Payment status: ${result.data.status}`)
      }
    } else {
      setApiError(result.error || 'Failed to submit payment')
    }
  }

  const handleReplayIdempotency = () => {
    if (lastSubmittedPayload) {
      handleSubmit(lastSubmittedPayload)
    }
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    message.success(`${label} copied to clipboard`)
  }

  const scenarioInfo = FAILURE_SCENARIOS[activeScenario] || FAILURE_SCENARIOS.NORMAL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Simulation Notice Banner */}
      <Alert
        type={activeScenario === 'NORMAL' ? 'info' : 'warning'}
        showIcon
        icon={<ThunderboltOutlined />}
        message={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Active Bank Simulation Scenario: <strong>{scenarioInfo.name}</strong>
            </span>
            <Tag color={scenarioInfo.tagColor}>{scenarioInfo.key}</Tag>
          </div>
        }
        description={
          <div>
            <Text style={{ fontSize: 13 }}>
              Expected outcome: <strong>{scenarioInfo.orchestratorOutcome}</strong>. {scenarioInfo.description}
            </Text>
            {activeScenario !== 'NORMAL' && (
              <div style={{ marginTop: 6 }}>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate('/failure-simulation')}
                >
                  Change or reset scenario in Failure Simulation &rarr;
                </Button>
              </div>
            )}
          </div>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Left Column: Payment Form */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SendOutlined style={{ color: '#1677ff' }} />
                <span>Initiate UPI Payment</span>
              </Space>
            }
            style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark="optional"
            >
              {/* Idempotency Key */}
              <Form.Item
                label={
                  <Space>
                    <span>Idempotency Key</span>
                    <Tooltip title="A unique key sent by the client. If resent with matching details, the backend returns the existing transaction result rather than duplicating the transfer.">
                      <InfoCircleOutlined style={{ color: '#94a3b8' }} />
                    </Tooltip>
                  </Space>
                }
                name="idempotencyKey"
                rules={[
                  { required: true, message: 'Idempotency key is required' },
                  { min: 3, message: 'Idempotency key must be at least 3 characters' },
                ]}
              >
                <Input
                  placeholder="e.g. IDEMP-DEMO-001"
                  addonAfter={
                    <Tooltip title="Generate new unique key">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleGenerateKey}
                      >
                        New Key
                      </Button>
                    </Tooltip>
                  }
                />
              </Form.Item>

              {/* Payer VPA */}
              <Form.Item
                label="Payer Virtual Payment Address (VPA)"
                name="payerVpa"
                rules={[
                  { required: true, message: 'Payer VPA is required' },
                  {
                    pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/,
                    message: 'Enter a valid VPA (e.g. alice@demo)',
                  },
                ]}
                extra="Pre-seeded virtual accounts: alice@demo (funded)"
              >
                <Input placeholder="alice@demo" />
              </Form.Item>

              {/* Payee VPA */}
              <Form.Item
                label="Payee Virtual Payment Address (VPA)"
                name="payeeVpa"
                rules={[
                  { required: true, message: 'Payee VPA is required' },
                  {
                    pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/,
                    message: 'Enter a valid VPA (e.g. bob@demo)',
                  },
                ]}
                extra="Destination payee account: bob@demo"
              >
                <Input placeholder="bob@demo" />
              </Form.Item>

              {/* Amount */}
              <Form.Item
                label="Payment Amount (₹)"
                name="amount"
                rules={[
                  { required: true, message: 'Amount is required' },
                  {
                    type: 'number',
                    min: 0.01,
                    message: 'Amount must be greater than zero',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  precision={2}
                  min={1}
                  max={100000}
                  prefix="₹"
                  placeholder="1000.00"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={loading}
                    size="large"
                    style={{ minWidth: 160 }}
                  >
                    Make Payment
                  </Button>

                  {lastSubmittedPayload && (
                    <Tooltip title="Replay the exact same payload to verify idempotency deduplication">
                      <Button
                        onClick={handleReplayIdempotency}
                        disabled={loading}
                        icon={<ReloadOutlined />}
                      >
                        Replay Exact Request
                      </Button>
                    </Tooltip>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Right Column: Execution Response & Live State */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                <span>Payment Response Details</span>
              </Space>
            }
            style={{ borderRadius: 8, minHeight: 400, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ marginBottom: 16 }}>
                  <ThunderboltOutlined style={{ fontSize: 36, color: '#1677ff' }} />
                </div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  Coordinating Payment Across Virtual Banks...
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Calling Orchestrator (:8080) &rarr; Payer Debit &rarr; Switch &rarr; Payee Credit (:8081)
                </Text>
              </div>
            )}

            {!loading && apiError && (
              <Alert
                type="error"
                showIcon
                message="Payment Submission Error"
                description={
                  <div>
                    <Paragraph style={{ margin: '8px 0 12px 0' }}>{apiError}</Paragraph>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      If this is an HTTP 404 from the orchestrator, verify if an idempotency key was reused with modified payment details.
                    </Text>
                  </div>
                }
              />
            )}

            {!loading && !paymentResult && !apiError && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <SendOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 12 }} />
                <Title level={5} style={{ color: '#64748b', fontWeight: 'normal' }}>
                  Awaiting Payment Submission
                </Title>
                <Text type="secondary" style={{ fontSize: 13, maxWidth: 360, display: 'inline-block' }}>
                  Fill in the payment details on the left and submit. The orchestrator response with the assigned Transaction ID and outcome will appear here.
                </Text>
              </div>
            )}

            {!loading && paymentResult && (
              <div>
                {/* Result Status Banner */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 8,
                    marginBottom: 20,
                    backgroundColor:
                      paymentResult.status === 'SUCCESS'
                        ? '#f6ffed'
                        : paymentResult.status === 'PENDING'
                        ? '#fffbe6'
                        : paymentResult.status === 'REVERSED'
                        ? '#f9f0ff'
                        : '#fff1f0',
                    border: `1px solid ${
                      paymentResult.status === 'SUCCESS'
                        ? '#b7eb8f'
                        : paymentResult.status === 'PENDING'
                        ? '#ffe58f'
                        : paymentResult.status === 'REVERSED'
                        ? '#d3adf7'
                        : '#ffa39e'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={10}>
                      {paymentResult.status === 'SUCCESS' && (
                        <CheckCircleFilled style={{ color: '#52c41a', fontSize: 24 }} />
                      )}
                      {paymentResult.status === 'PENDING' && (
                        <ClockCircleFilled style={{ color: '#faad14', fontSize: 24 }} />
                      )}
                      {paymentResult.status === 'FAILED' && (
                        <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 24 }} />
                      )}
                      {paymentResult.status === 'REVERSED' && (
                        <ThunderboltOutlined style={{ color: '#722ed1', fontSize: 24 }} />
                      )}
                      <div>
                        <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                          Status: {paymentResult.status}
                        </Text>
                        <Text style={{ display: 'block', fontSize: 13, color: '#475569' }}>
                          {paymentResult.message}
                        </Text>
                      </div>
                    </Space>
                    <StatusBadge status={paymentResult.status} />
                  </div>
                </div>

                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Transaction ID">
                    <Space>
                      <Text code strong style={{ fontSize: 13 }}>
                        {paymentResult.transactionId}
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(paymentResult.transactionId, 'Transaction ID')}
                      />
                    </Space>
                  </Descriptions.Item>

                  <Descriptions.Item label="Amount">
                    <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                      {formatCurrency(paymentResult.amount)}
                    </Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Payer VPA">
                    <Text>{lastSubmittedPayload?.payerVpa}</Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Payee VPA">
                    <Text>{lastSubmittedPayload?.payeeVpa}</Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Idempotency Key">
                    <Text code>{lastSubmittedPayload?.idempotencyKey}</Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* Conditional Actions based on status */}
                {paymentResult.status === 'PENDING' && (
                  <div style={{ marginTop: 16 }}>
                    <Alert
                      type="warning"
                      showIcon
                      message="Downstream Timeout / Uncertainty"
                      description="Credit outcome could not be determined before the read-timeout. You can now test recovery!"
                      action={
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => navigate('/recovery')}
                          style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                        >
                          Go to Recovery
                        </Button>
                      }
                    />
                  </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => {
                      handleGenerateKey()
                      setPaymentResult(null)
                    }}
                  >
                    New Transaction
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => navigate('/transactions')}
                  >
                    View in Transactions
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
