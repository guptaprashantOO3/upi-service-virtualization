import React from 'react'
import { Layout, Button, Space, Typography, Tooltip, Tag, Popconfirm, message } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  RollbackOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { HealthIndicator } from '../common/HealthIndicator'
import { useTransactions } from '../../hooks/useTransactions'
import { scenarioService } from '../../services/scenarioService'

const { Header } = Layout
const { Title } = Typography

const titleMap = {
  '/': 'UPI System Dashboard',
  '/dashboard': 'UPI System Dashboard',
  '/make-payment': 'Make Payment',
  '/transactions': 'Payment Transactions',
  '/failure-simulation': 'Failure Injection & Simulation',
  '/recovery': 'Payment Timeout Recovery',
  '/metrics': 'Application & Network Metrics',
}

export function HeaderBar({ collapsed, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeScenario, setActiveScenario } = useTransactions()

  const currentTitle = titleMap[location.pathname] || 'UPI Virtualization Platform'

  const handleResetScenario = async () => {
    const result = await scenarioService.resetScenario()
    if (result.success) {
      setActiveScenario('NORMAL')
      message.success('Failure scenario reset to NORMAL')
    } else {
      message.error(result.error || 'Failed to reset scenario')
    }
  }

  return (
    <Header
      style={{
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        height: 64,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Left: Collapse button and page title */}
      <Space size={16} align="center">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{ fontSize: 16, width: 36, height: 36 }}
        />
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 600 }}>
            {currentTitle}
          </Title>
        </div>
      </Space>

      {/* Right: Live health indicator and quick buttons */}
      <Space size="middle" align="center">
        <HealthIndicator compact={true} />

        {activeScenario !== 'NORMAL' && (
          <Popconfirm
            title="Reset Simulation Scenario?"
            description="Revert virtual banking network back to NORMAL mode."
            onConfirm={handleResetScenario}
            okText="Reset to NORMAL"
            cancelText="Keep"
          >
            <Button
              size="small"
              danger
              icon={<RollbackOutlined />}
            >
              Reset Scenario
            </Button>
          </Popconfirm>
        )}

        <Button
          type="primary"
          size="middle"
          icon={<PlusOutlined />}
          onClick={() => navigate('/make-payment')}
        >
          New Payment
        </Button>
      </Space>
    </Header>
  )
}
