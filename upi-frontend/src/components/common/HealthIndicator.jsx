import React, { useState, useEffect, useCallback } from 'react'
import { Card, Space, Badge, Typography, Button, Tooltip, Tag } from 'antd'
import {
  ReloadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ApiOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { metricsService } from '../../services/metricsService'
import { useTransactions } from '../../hooks/useTransactions'
import { FAILURE_SCENARIOS } from '../../utils/constants'

const { Text } = Typography

export function HealthIndicator({ compact = false }) {
  const [orchestratorUp, setOrchestratorUp] = useState(null)
  const [virtualUp, setVirtualUp] = useState(null)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)
  const { activeScenario, refreshScenario } = useTransactions()

  const checkHealth = useCallback(async () => {
    setChecking(true)
    const [orchRes, virtRes] = await Promise.all([
      metricsService.getOrchestratorHealth(),
      metricsService.getVirtualHealth(),
    ])
    setOrchestratorUp(orchRes.success && orchRes.status === 'UP')
    setVirtualUp(virtRes.success && virtRes.status === 'UP')
    setLastChecked(new Date())
    refreshScenario()
    setChecking(false)
  }, [refreshScenario])

  useEffect(() => {
    checkHealth()
    const timer = setInterval(checkHealth, 30000)
    return () => clearInterval(timer)
  }, [checkHealth])

  const scenarioMeta = FAILURE_SCENARIOS[activeScenario] || FAILURE_SCENARIOS.NORMAL

  if (compact) {
    return (
      <Space orientation="horizontal" size="middle" align="center">
        <Tooltip title="Spring Boot Orchestrator (:8080) status">
          <Space size={6} style={{ cursor: 'pointer' }} onClick={checkHealth}>
            <Badge status={orchestratorUp ? 'success' : orchestratorUp === false ? 'error' : 'default'} />
            <Text orientation="horizontal" style={{ fontSize: 13, color: '#475569' }}>
              Orchestrator: <strong>{orchestratorUp ? 'UP (8080)' : orchestratorUp === false ? 'DOWN' : 'Checking...'}</strong>
            </Text>
          </Space>
        </Tooltip>

        <span style={{ color: '#cbd5e1' }}>|</span>

        <Tooltip title="Spring Boot Virtual Network (:8081) status">
          <Space size={6} style={{ cursor: 'pointer' }} onClick={checkHealth}>
            <Badge status={virtualUp ? 'success' : virtualUp === false ? 'error' : 'default'} />
            <Text orientation="horizontal" style={{ fontSize: 13, color: '#475569' }}>
              Virtual Bank: <strong>{virtualUp ? 'UP (8081)' : virtualUp === false ? 'DOWN' : 'Checking...'}</strong>
            </Text>
          </Space>
        </Tooltip>

        <span style={{ color: '#cbd5e1' }}>|</span>

        <Tooltip title={`Active Failure Scenario: ${scenarioMeta.name}`}>
          <Tag color={scenarioMeta.tagColor} style={{ margin: 0, fontWeight: 500 }}>
            Scenario: {scenarioMeta.key}
          </Tag>
        </Tooltip>

        <Tooltip title="Refresh System Status">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={checking} />}
            onClick={checkHealth}
          />
        </Tooltip>
      </Space>
    )
  }

  return (
    <Card
      size="small"
      style={{
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space size="large" wrap>
          {/* Orchestrator node */}
          <Space size={8}>
            {orchestratorUp ? (
              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
            ) : orchestratorUp === false ? (
              <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
            ) : (
              <Badge status="processing" />
            )}
            <div>
              <Text style={{ fontSize: 11, color: '#64748b', display: 'block', lineHeight: 1.2 }}>
                UPI ORCHESTRATOR (:8080)
              </Text>
              <Text strong style={{ color: orchestratorUp ? '#0f172a' : '#ef4444' }}>
                {orchestratorUp ? 'Operational' : orchestratorUp === false ? 'Unavailable' : 'Checking'}
              </Text>
            </div>
          </Space>

          {/* Virtual Network node */}
          <Space size={8}>
            {virtualUp ? (
              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
            ) : virtualUp === false ? (
              <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
            ) : (
              <Badge status="processing" />
            )}
            <div>
              <Text style={{ fontSize: 11, color: '#64748b', display: 'block', lineHeight: 1.2 }}>
                VIRTUAL NETWORK (:8081)
              </Text>
              <Text strong style={{ color: virtualUp ? '#0f172a' : '#ef4444' }}>
                {virtualUp ? 'Operational' : virtualUp === false ? 'Unavailable' : 'Checking'}
              </Text>
            </div>
          </Space>

          {/* Active Scenario node */}
          <Space size={8}>
            <ThunderboltOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <div>
              <Text style={{ fontSize: 11, color: '#64748b', display: 'block', lineHeight: 1.2 }}>
                ACTIVE SIMULATION
              </Text>
              <Tag color={scenarioMeta.tagColor} style={{ margin: 0, fontWeight: 600 }}>
                {scenarioMeta.key}
              </Tag>
            </div>
          </Space>
        </Space>

        <Space>
          {lastChecked && (
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>
              Checked at {lastChecked.toLocaleTimeString()}
            </Text>
          )}
          <Button
            size="small"
            icon={<ReloadOutlined spin={checking} />}
            onClick={checkHealth}
            loading={checking}
          >
            Check Health
          </Button>
        </Space>
      </div>
    </Card>
  )
}
