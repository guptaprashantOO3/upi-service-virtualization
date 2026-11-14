import React, { useState } from 'react'
import {
  Modal,
  Descriptions,
  Typography,
  Button,
  Space,
  Alert,
  Divider,
  Tag,
  message,
} from 'antd'
import {
  CopyOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { StatusBadge } from './StatusBadge'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import { paymentService } from '../../services/paymentService'
import { metricsService } from '../../services/metricsService'
import { useTransactions } from '../../hooks/useTransactions'

const { Text, Paragraph } = Typography

export function TransactionDetailModal({ visible, transaction, onClose, onUpdated }) {
  const [syncing, setSyncing] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [payeeChecking, setPayeeChecking] = useState(false)
  const [payeeRecord, setPayeeRecord] = useState(null)
  const { recordTransaction } = useTransactions()

  if (!transaction) return null

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    message.success(`${label} copied to clipboard`)
  }

  const handleSyncStatus = async () => {
    setSyncing(true)
    const result = await paymentService.getPaymentStatus(transaction.transactionId)
    setSyncing(false)
    if (result.success && result.data) {
      recordTransaction(result.data)
      message.success('Status updated from orchestrator backend')
      if (onUpdated) onUpdated(result.data)
    } else {
      message.error(result.error || 'Failed to sync transaction status')
    }
  }

  const handleRecover = async () => {
    setRecovering(true)
    const result = await paymentService.recoverPayment(transaction.transactionId)
    setRecovering(false)
    if (result.success && result.data) {
      recordTransaction(result.data)
      message.success(`Recovery finished: ${result.data.status}`)
      if (onUpdated) onUpdated(result.data)
    } else {
      message.error(result.error || 'Recovery failed')
    }
  }

  const handleCheckPayee = async () => {
    setPayeeChecking(true)
    const result = await metricsService.getPayeeTransactionStatus(transaction.transactionId)
    setPayeeChecking(false)
    if (result.success) {
      setPayeeRecord(result.data)
      message.success('Virtual Payee Bank record found')
    } else {
      setPayeeRecord({ notFound: true, message: result.error })
    }
  }

  const isPending = transaction.status === 'PENDING'

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          <span>Transaction Details</span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        setPayeeRecord(null)
        onClose()
      }}
      footer={[
        <Button
          key="payee"
          icon={<BankOutlined />}
          onClick={handleCheckPayee}
          loading={payeeChecking}
        >
          Check Payee Bank Record
        </Button>,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleSyncStatus}
          loading={syncing}
        >
          Fetch Latest Status
        </Button>,
        isPending && (
          <Button
            key="recover"
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleRecover}
            loading={recovering}
            style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
          >
            Trigger Recovery
          </Button>
        ),
        <Button
          key="close"
          onClick={() => {
            setPayeeRecord(null)
            onClose()
          }}
        >
          Close
        </Button>,
      ].filter(Boolean)}
      width={680}
    >
      <div style={{ marginTop: 16 }}>
        {isPending && (
          <Alert
            type="warning"
            showIcon
            message="Payment in PENDING State"
            description="This transaction timed out or encountered an uncertain downstream result. You can query the payee bank or trigger recovery to resolve it safely."
            style={{ marginBottom: 16 }}
          />
        )}

        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Transaction ID" span={2}>
            <Space orientation="horizontal" align="center">
              <Text code strong>{transaction.transactionId}</Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(transaction.transactionId, 'Transaction ID')}
              />
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Payment Status">
            <StatusBadge status={transaction.status} />
          </Descriptions.Item>

          <Descriptions.Item label="Amount">
            <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
              {formatCurrency(transaction.amount)}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Payer VPA">
            <Text>{transaction.payerVpa || 'alice@demo'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Payee VPA">
            <Text>{transaction.payeeVpa || 'bob@demo'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Idempotency Key" span={2}>
            <Space orientation="horizontal" align="center">
              <Text code>{transaction.idempotencyKey || '—'}</Text>
              {transaction.idempotencyKey && transaction.idempotencyKey !== '—' && (
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(transaction.idempotencyKey, 'Idempotency Key')}
                />
              )}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Recorded At" span={2}>
            {formatDateTime(transaction.createdAt || transaction.updatedAt)}
          </Descriptions.Item>

          <Descriptions.Item label="Backend Message" span={2}>
            <Text type={transaction.status === 'FAILED' ? 'danger' : 'secondary'}>
              {transaction.message || 'No additional message from backend.'}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        {/* Payee Direct Record Inspection */}
        {payeeRecord && (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left" style={{ fontSize: 13, color: '#64748b' }}>
              Payee Bank Direct Record (:8081)
            </Divider>
            {payeeRecord.notFound ? (
              <Alert
                type="info"
                showIcon
                message="No Credit Record Found in Payee Bank"
                description={payeeRecord.message || 'GET /virtual/payee/transactions/{id} returned 404. Payee bank has not committed this transaction.'}
              />
            ) : (
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Payee Status">
                  <Tag color={payeeRecord.status === 'SUCCESS' ? 'green' : 'red'}>
                    {payeeRecord.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Credited Amount / Balance">
                  {payeeRecord.balance !== undefined ? formatCurrency(payeeRecord.balance) : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Payee Message" span={2}>
                  {payeeRecord.message || 'Record confirmed'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
