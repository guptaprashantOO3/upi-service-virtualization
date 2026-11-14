import React, { useState } from 'react'
import {
  Card,
  Input,
  Button,
  Table,
  Space,
  Typography,
  Alert,
  Tag,
  Descriptions,
  Row,
  Col,
  Empty,
  Tooltip,
  Popconfirm,
  message,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { paymentService } from '../services/paymentService'
import { useTransactions } from '../hooks/useTransactions'
import { StatusBadge } from '../components/common/StatusBadge'
import { TransactionDetailModal } from '../components/common/TransactionDetailModal'
import { formatCurrency, formatDateTime } from '../utils/formatters'

const { Title, Text, Paragraph } = Typography
const { Search } = Input

export function Transactions() {
  const navigate = useNavigate()
  const { transactions, recordTransaction, clearSessionHistory, syncTransactionStatus } =
    useTransactions()

  const [searchId, setSearchId] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState(null)

  const [selectedTx, setSelectedTx] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [refreshingAll, setRefreshingAll] = useState(false)

  // Direct backend lookup
  const handleSearch = async (value) => {
    const id = (value || searchId).trim()
    if (!id) {
      message.warning('Please enter a Transaction ID to look up')
      return
    }

    setSearching(true)
    setSearchError(null)
    setSearchResult(null)

    const result = await paymentService.getPaymentStatus(id)
    setSearching(false)

    if (result.success && result.data) {
      setSearchResult(result.data)
      recordTransaction(result.data)
      message.success('Transaction found in backend')
    } else {
      setSearchError(result.error || `Transaction "${id}" not found on orchestrator`)
    }
  }

  // Refresh all session transactions against the backend
  const handleRefreshAll = async () => {
    if (transactions.length === 0) return
    setRefreshingAll(true)
    let updatedCount = 0
    for (const tx of transactions) {
      const res = await syncTransactionStatus(tx.transactionId)
      if (res.success) updatedCount++
    }
    setRefreshingAll(false)
    message.success(`Refreshed ${updatedCount} transactions from orchestrator backend`)
  }

  const handleViewDetails = (record) => {
    setSelectedTx(record)
    setModalVisible(true)
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    message.success(`${label} copied`)
  }

  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      render: (text) => (
        <Space size={4}>
          <Text code strong style={{ fontSize: 12 }}>
            {text}
          </Text>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined style={{ fontSize: 11 }} />}
            onClick={() => handleCopy(text, 'Transaction ID')}
          />
        </Space>
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
      title: 'Recorded Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(date)}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={6}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>

          {record.status === 'PENDING' && (
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/recovery')}
              style={{ color: '#faad14' }}
            >
              Recover
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Backend Limitation Notice Card */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="Backend API Architecture Note"
        description={
          <div>
            <Paragraph style={{ margin: 0, fontSize: 13 }}>
              The Spring Boot orchestrator (port 8080) stores payment records in an in-memory repository (<code>ConcurrentHashMap</code>) and exposes single-transaction lookup via{' '}
              <code>GET /api/payments/{'{transactionId}'}</code>. It does not provide a global list endpoint (<code>GET /api/payments</code>).
            </Paragraph>
            <Paragraph style={{ margin: '6px 0 0 0', fontSize: 12, color: '#64748b' }}>
              Below, you can query any transaction ID directly from the backend, alongside transactions recorded during your current browser session.
            </Paragraph>
          </div>
        }
      />

      {/* Direct Backend Search Box */}
      <Card
        title={
          <Space>
            <SearchOutlined style={{ color: '#1677ff' }} />
            <span>Search Transaction by ID (Direct Backend Enquiry)</span>
          </Space>
        }
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={18}>
            <Search
              placeholder="Enter exact Transaction ID (e.g. TXN-1001 or TXN-8df...)"
              enterButton="Search Backend"
              size="large"
              loading={searching}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button
              block
              size="large"
              icon={<ReloadOutlined spin={refreshingAll} />}
              onClick={handleRefreshAll}
              disabled={transactions.length === 0}
            >
              Sync All Session Records
            </Button>
          </Col>
        </Row>

        {/* Backend Search Result Display */}
        {searchResult && (
          <div style={{ marginTop: 20 }}>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Transaction Found: <strong>{searchResult.transactionId}</strong></span>
                  <StatusBadge status={searchResult.status} />
                </div>
              }
              description={
                <div style={{ marginTop: 10 }}>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Status">
                      <StatusBadge status={searchResult.status} size="small" />
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      <Text strong>{formatCurrency(searchResult.amount)}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Message" span={2}>
                      <Text type={searchResult.status === 'FAILED' ? 'danger' : 'secondary'}>
                        {searchResult.message}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetails(searchResult)}
                    >
                      View Full Details
                    </Button>
                    {searchResult.status === 'PENDING' && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => navigate('/recovery')}
                        style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                      >
                        Recover This Payment
                      </Button>
                    )}
                  </div>
                </div>
              }
            />
          </div>
        )}

        {searchError && (
          <div style={{ marginTop: 20 }}>
            <Alert
              type="error"
              showIcon
              message="Transaction Not Found or Unavailable"
              description={searchError}
            />
          </div>
        )}
      </Card>

      {/* Session Transactions History Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text strong style={{ fontSize: 16 }}>
                Session Transactions ({transactions.length})
              </Text>
              <Tooltip title="Transactions executed or queried in this browser tab. Click 'Sync All' to verify latest status from backend.">
                <InfoCircleOutlined style={{ color: '#94a3b8' }} />
              </Tooltip>
            </Space>

            {transactions.length > 0 && (
              <Popconfirm
                title="Clear Session History?"
                description="This will clear your local list in the browser. It does not affect the backend repository."
                onConfirm={clearSessionHistory}
                okText="Clear"
                cancelText="Cancel"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Clear History
                </Button>
              </Popconfirm>
            )}
          </div>
        }
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {transactions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No transactions tracked in this session yet."
          >
            <Button
              type="primary"
              onClick={() => navigate('/make-payment')}
            >
              Make a Payment
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={transactions}
            columns={columns}
            rowKey="transactionId"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        )}
      </Card>

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTx}
        onClose={() => setModalVisible(false)}
        onUpdated={(updated) => setSelectedTx(updated)}
      />
    </div>
  )
}
