import React, { useState } from 'react'
import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { HeaderBar } from './HeaderBar'

const { Content, Footer } = Layout

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 240,
          transition: 'all 0.2s',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc',
        }}
      >
        <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        <Content
          style={{
            margin: '20px 24px',
            flex: 1,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>

        <Footer
          style={{
            textAlign: 'center',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: 12,
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          UPI Service Virtualization & Resilience Testing Platform • Orchestrator (8080) & Virtual Network (8081)
        </Footer>
      </Layout>
    </Layout>
  )
}

