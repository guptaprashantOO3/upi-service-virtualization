import React from 'react'
import { Layout, Menu, Typography, Tag, Space } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  SendOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  BankOutlined,
} from '@ant-design/icons'

const { Sider } = Layout
const { Text, Title } = Typography

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/make-payment',
    icon: <SendOutlined />,
    label: 'Make Payment',
  },
  {
    key: '/transactions',
    icon: <HistoryOutlined />,
    label: 'Transactions',
  },
  {
    key: '/failure-simulation',
    icon: <ThunderboltOutlined />,
    label: 'Failure Simulation',
  },
  {
    key: '/recovery',
    icon: <SafetyCertificateOutlined />,
    label: 'Payment Recovery',
  },
  {
    key: '/metrics',
    icon: <BarChartOutlined />,
    label: 'System Metrics',
  },
]

export function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Match root path to /dashboard
  const selectedKey = location.pathname === '/' ? '/dashboard' : location.pathname

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      theme="dark"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#0a192f',
        zIndex: 100,
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Brand logo & header */}
      <div
        style={{
          height: 64,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <BankOutlined />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <Title
              level={5}
              style={{
                color: '#ffffff',
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
              }}
            >
              UPI Virtualize
            </Title>
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 11,
                display: 'block',
                whiteSpace: 'nowrap',
              }}
            >
              Resilience Platform
            </Text>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          backgroundColor: '#0a192f',
          marginTop: 12,
          borderRight: 'none',
        }}
      />

      {/* Network Ports Footer Info */}
      {!collapsed && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 16,
            right: 16,
            padding: '12px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
            SERVICE ENDPOINTS
          </Text>
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1' }}>
              <span>Orchestrator:</span>
              <Tag color="blue" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                :8080
              </Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1' }}>
              <span>Virtual Bank:</span>
              <Tag color="cyan" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                :8081
              </Tag>
            </div>
          </Space>
        </div>
      )}
    </Sider>
  )
}

