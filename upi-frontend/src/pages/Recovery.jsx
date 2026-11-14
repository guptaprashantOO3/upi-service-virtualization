import React, { useState } from 'react'
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Descriptions,
  Row,
  Col,
  Tag,
  Divider,
  Timeline,
  message,
} from 'antd'
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  BankOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { paymentService } from '../services/paymentService'
import { metricsService } from '../services/metricsService'
import { useTransactions } from '../hooks/useTransactions'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatCurrency } from '../utils/formatters'
import { PAYMENT_STATUS_CONFIG } from '../utils/constants'

const { Title, Text, Paragraph } = Typography
const { Search } = Input

export function Recovery() {
  const { transactions, recordTransaction } = useTransactions()

  const [transactionId, setTransactionId] = useState('')
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [payeeChecking, setPayeeChecking] = useState(false)

  const [currentRecord, setCurrentRecord] = useState(null)
  const [payeeRecord, setPayeeRecord] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const [errorNotice, setErrorNotice] = useState(null)

  // Pending transactions in current session
  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING')

  // Status enquiry (GET /api/payments/{transactionId})
  const handleEnquiry = async (idToQuery) => {
    const id = (idToQuery || transactionId).trim()
    if (!id) {
      message.warning('Please enter a Transaction ID')
      return
    }

    setEnquiryLoading(true)
    setErrorNotice(null)
    setActionNotice(null)

    const result = await paymentService.getPaymentStatus(id)
    setEnquiryLoading(false)

    if (result.success && result.data) {
      setCurrentRecord(result.data)
      recordTransaction(result.data)
      setActionNotice({
        type: 'info',
        title: 'Status Enquiry Successful',
        message: `Current orchestrator status: ${result.data.status}`,
      })
    } else {
      setErrorNotice(result.error || `Transaction "${id}" not found on orchestrator`)
      setCurrentRecord(null)
    }
  }

  // Trigger Recovery (POST /api/payments/{transactionId}/recover)
  const handleRecover = async () => {
    if (!currentRecord?.transactionId) {
      message.warning('Please fetch transaction status first')
      return
    }

    setRecoveryLoading(true)
    setErrorNotice(null)
    setActionNotice(null)

    const result = await paymentService.recoverPayment(currentRecord.transactionId)
    setRecoveryLoading(false)

    if (result.success && result.data) {
      setCurrentRecord(result.data)
      recordTransaction(result.data)
      setActionNotice({
        type: result.data.status === 'SUCCESS' ? 'success' : 'warning',
        title: 'Recovery Execution Completed',
        message: `Recovery result: ${result.data.status} — ${result.data.message}`,
      })
      message.success(`Payment recovered with status: ${result.data.status}`)
    } else {
      setErrorNotice(result.error || 'Payment recovery operation failed')
    }
  }

  // Direct Payee Bank Enquiry (GET /virtual/payee/transactions/{transactionId})
  const handleCheckPayeeBank = async () => {
    const id = (currentRecord?.transactionId || transactionId).trim()
    if (!id) {
      message.warning('Enter a Transaction ID first')
      return
    }

    setPayeeChecking(true)
    const result = await metricsService.getPayeeTransactionStatus(id)
    setPayeeChecking(false)

    if (result.success) {
      setPayeeRecord(result.data)
      message.success('Payee Bank record retrieved')
    } else {
      setPayeeRecord({ notFound: true, message: result.error })
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    message.success('Copied to clipboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Educational Concept Banner */}
      <Card
        style={{
          borderRadius: 8,
          background: 'linear-gradient(135deg, #0a192f 0%, #1e293b 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Space orientation="horizontal" size={10} style={{ marginBottom: 8 }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
          <Title level={4} style={{ color: '#ffffff', margin: 0 }}>
            Payment Timeout Recovery & State Reconciliation
          </Title>
        </Space>
        <Paragraph style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>
          In real UPI payment networks, when a payee bank times out, blindly retrying the credit can cause a double debit/credit, and blindly reversing can steal money from an account that was credited.
          Recovery safely reconciles the status by querying the payee bank’s transaction ledger (<code>GET /virtual/payee/transactions/{'{id}'}</code>) without re-initiating transfers.
        </Paragraph>
      </Card>

      {/* Difference Explanation Alert */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="Understanding the Operations"
        description={
          <Row gutter={[16, 8]} style={{ marginTop: 6 }}>
            <Col xs={24} md={12}>
              <Text strong style={{ color: '#0284c7' }}>
                1. Status Enquiry (GET /api/payments/{'{id}'})
              </Text>
              <Paragraph style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                Read-only query to the orchestrator’s in-memory state. Does not invoke downstream virtual banking APIs.
              </Paragraph>
            </Col>
            <Col xs={24} md={12}>
              <Text strong style={{ color: '#d97706' }}>
                2. Recovery Operation (POST /api/payments/{'{id}'}/recover)
              </Text>
              <Paragraph style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                Actively queries the Virtual Payee Bank (:8081). If payee confirms credit, transitions status from PENDING &rarr; SUCCESS. If payee confirmed failure, initiates reversal.
              </Paragraph>
            </Col>
          </Row>
        }
      />

      {/* Input Section */}
      <Card
        title={
          <Space>
            <SearchOutlined style={{ color: '#1677ff' }} />
            <span>Select or Enter Transaction for Recovery</span>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {/* Quick select pending transactions from current session */}
        {pendingTransactions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              PENDING TRANSACTIONS IN CURRENT SESSION:
            </Text>
            <Space wrap>
              {pendingTransactions.map((tx) => (
                <Button
                  key={tx.transactionId}
                  size="small"
                  type={transactionId === tx.transactionId ? 'primary' : 'default'}
                  onClick={() => {
                    setTransactionId(tx.transactionId)
                    handleEnquiry(tx.transactionId)
                  }}
                  icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                >
                  {tx.transactionId} ({formatCurrency(tx.amount)})
                </Button>
              ))}
            </Space>
          </div>
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Search
              placeholder="Enter Transaction ID (e.g. TXN-1001 or TXN-...)"
              enterButton="Check Orchestrator Status"
              size="large"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              onSearch={() => handleEnquiry()}
              loading={enquiryLoading}
            />
          </Col>
          <Col xs={24} md={8}>
            <Button
              block
              size="large"
              icon={<BankOutlined />}
              onClick={handleCheckPayeeBank}
              loading={payeeChecking}
            >
              Direct Payee Bank Check (:8081)
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Feedback Alert */}
      {actionNotice && (
        <Alert
          type={actionNotice.type}
          showIcon
          message={actionNotice.title}
          description={actionNotice.message}
          closable
        />
      )}

      {errorNotice && (
        <Alert
          type="error"
          showIcon
          message="Operation Failed"
          description={errorNotice}
          closable
        />
      )}

      {/* Transaction Details & Recovery Action Card */}
      {currentRecord && (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                    <span>Transaction Status & Recovery Controls</span>
                  </Space>
                  <StatusBadge status={currentRecord.status} />
                </div>
              }
              style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Transaction ID" span={2}>
                  <Space>
                    <Text code strong>{currentRecord.transactionId}</Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(currentRecord.transactionId)}
                    />
                  </Space>
                </Descriptions.Item>

                <Descriptions.Item label="Current Status">
                  <StatusBadge status={currentRecord.status} />
                </Descriptions.Item>

                <Descriptions.Item label="Amount">
                  <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                    {formatCurrency(currentRecord.amount)}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item label="Orchestrator Message" span={2}>
                  <Text type={currentRecord.status === 'FAILED' ? 'danger' : 'secondary'}>
                    {currentRecord.message || '—'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {/* Status Explanation box */}
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor:
                    currentRecord.status === 'SUCCESS'
                      ? '#f6ffed'
                      : currentRecord.status === 'PENDING'
                      ? '#fffbe6'
                      : currentRecord.status === 'REVERSED'
                      ? '#f9f0ff'
                      : '#fff1f0',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                  Status Meaning:
                </Text>
                <Text style={{ fontSize: 13, color: '#475569' }}>
                  {PAYMENT_STATUS_CONFIG[currentRecord.status]?.description || currentRecord.message}
                </Text>
              </div>

              {/* Trigger Recovery Button Bar */}
              <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={handleRecover}
                  loading={recoveryLoading}
                  disabled={currentRecord.status !== 'PENDING'}
                  style={{
                    backgroundColor: currentRecord.status === 'PENDING' ? '#faad14' : undefined,
                    borderColor: currentRecord.status === 'PENDING' ? '#faad14' : undefined,
                    minWidth: 180,
                  }}
                >
                  Trigger Recovery
                </Button>

                <Button
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={() => handleEnquiry()}
                  loading={enquiryLoading}
                >
                  Refresh Status
                </Button>

                {currentRecord.status !== 'PENDING' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Recovery is only applicable for transactions in <strong>PENDING</strong> state.
                  </Text>
                )}
              </div>
            </Card>
          </Col>

          {/* Right Column: Direct Payee Bank Record Inspector */}
          <Col xs={24} lg={9}>
            <Card
              title={
                <Space>
                  <BankOutlined style={{ color: '#1677ff' }} />
                  <span>Virtual Payee Bank Record (:8081)</span>
                </Space>
              }
              style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <Paragraph style={{ fontSize: 12, color: '#64748b' }}>
                Directly probes <code>GET /virtual/payee/transactions/{'{id}'}</code> to see if the payee bank committed the credit into its internal ledger.
              </Paragraph>

              <Button
                block
                icon={<BankOutlined />}
                onClick={handleCheckPayeeBank}
                loading={payeeChecking}
                style={{ marginBottom: 16 }}
              >
                Query Payee Bank Record
              </Button>

              {payeeRecord && (
                <div>
                  {payeeRecord.notFound ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="No Record in Payee Bank"
                      description="Virtual Payee Bank returned HTTP 404. Either credit was not called or failed before commit."
                    />
                  ) : (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="Recorded Payee Status">
                        <Tag color={payeeRecord.status === 'SUCCESS' ? 'green' : 'red'}>
                          {payeeRecord.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Account Balance">
                        {payeeRecord.balance !== undefined ? formatCurrency(payeeRecord.balance) : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Payee Message">
                        {payeeRecord.message || 'Credit committed'}
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
