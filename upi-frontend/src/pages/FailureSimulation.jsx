import React, { useState, useEffect } from 'react'
import {
  Card,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Tag,
  Descriptions,
  Divider,
  Tabs,
  Timeline,
  Collapse,
  Badge,
  Steps,
  message,
} from 'antd'
import {
  ThunderboltOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  RollbackOutlined,
  PlayCircleOutlined,
  CompassOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { scenarioService } from '../services/scenarioService'
import { paymentService } from '../services/paymentService'
import { metricsService } from '../services/metricsService'
import { useTransactions } from '../hooks/useTransactions'
import { FAILURE_SCENARIOS, DEMO_VPA } from '../utils/constants'
import { StatusBadge } from '../components/common/StatusBadge'
import { formatCurrency, generateIdempotencyKey } from '../utils/formatters'

const { Title, Text, Paragraph } = Typography

export function FailureSimulation() {
  const navigate = useNavigate()
  const { activeScenario, setActiveScenario, refreshScenario, recordTransaction } =
    useTransactions()

  const [activeTab, setActiveTab] = useState('showcase')
  const [selectedScenario, setSelectedScenario] = useState(activeScenario)
  const [updating, setUpdating] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Live showcase execution states
  const [demoRunningScenario, setDemoRunningScenario] = useState(null)
  const [demoResults, setDemoResults] = useState({})
  const [recoveringTx, setRecoveringTx] = useState(null)

  // Standard test payment states (for Tab 2)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError] = useState(null)

  useEffect(() => {
    refreshScenario().then((res) => {
      if (res?.scenario) {
        setSelectedScenario(res.scenario)
      }
    })
  }, [refreshScenario])

  // Apply scenario
  const handleApplyScenario = async (scenarioToApply) => {
    const target = scenarioToApply || selectedScenario
    setUpdating(true)
    const result = await scenarioService.updateScenario(target)
    setUpdating(false)

    if (result.success) {
      setActiveScenario(result.scenario)
      setSelectedScenario(result.scenario)
      message.success(`Simulation scenario changed to: ${result.scenario}`)
    } else {
      message.error(result.error || 'Failed to update failure scenario')
    }
  }

  // Reset scenario to NORMAL
  const handleReset = async () => {
    setResetting(true)
    const result = await scenarioService.resetScenario()
    setResetting(false)

    if (result.success) {
      setActiveScenario('NORMAL')
      setSelectedScenario('NORMAL')
      message.success('Failure scenario reset to NORMAL')
    } else {
      message.error(result.error || 'Failed to reset scenario')
    }
  }

  // Showcase: Run Live Demonstration for a specific scenario
  const handleRunLiveDemo = async (scenarioKey) => {
    setDemoRunningScenario(scenarioKey)
    try {
      // 1. Activate scenario on Virtual Bank (:8081)
      const setRes = await scenarioService.updateScenario(scenarioKey)
      if (!setRes.success) {
        message.error(`Failed to activate scenario: ${setRes.error}`)
        setDemoRunningScenario(null)
        return
      }
      setActiveScenario(scenarioKey)
      setSelectedScenario(scenarioKey)

      // 2. Submit payment to Orchestrator (:8080)
      const idempKey = generateIdempotencyKey()
      const payload = {
        idempotencyKey: idempKey,
        payerVpa: DEMO_VPA.PAYER,
        payeeVpa: DEMO_VPA.PAYEE,
        amount: 1000.0,
      }

      const paymentRes = await paymentService.createPayment(payload)
      if (paymentRes.success && paymentRes.data) {
        recordTransaction({
          ...paymentRes.data,
          idempotencyKey: idempKey,
          payerVpa: payload.payerVpa,
          payeeVpa: payload.payeeVpa,
        })

        // 3. For timeout scenario, verify payee bank record directly
        let payeeRecord = null
        if (scenarioKey === 'PAYEE_TIMEOUT_AFTER_CREDIT') {
          const payeeRes = await metricsService.getPayeeTransactionStatus(
            paymentRes.data.transactionId
          )
          if (payeeRes.success) {
            payeeRecord = payeeRes.data
          }
        }

        setDemoResults((prev) => ({
          ...prev,
          [scenarioKey]: {
            ...paymentRes.data,
            payeeRecord,
            executedAt: new Date(),
          },
        }))

        message.success(
          `Live Demo for ${scenarioKey} finished with status: ${paymentRes.data.status}`
        )
      } else {
        message.error(paymentRes.error || 'Payment execution failed')
      }
    } catch (err) {
      message.error(`Demo failed: ${err.message}`)
    } finally {
      setDemoRunningScenario(null)
    }
  }

  // Showcase: Trigger inline recovery for the timeout demo
  const handleInlineRecover = async (scenarioKey, txnId) => {
    setRecoveringTx(txnId)
    const res = await paymentService.recoverPayment(txnId)
    setRecoveringTx(null)

    if (res.success && res.data) {
      recordTransaction(res.data)
      setDemoResults((prev) => ({
        ...prev,
        [scenarioKey]: {
          ...prev[scenarioKey],
          status: res.data.status,
          message: res.data.message,
          recovered: true,
        },
      }))
      message.success(`Payment recovered! New Status: ${res.data.status}`)
    } else {
      message.error(res.error || 'Recovery failed')
    }
  }

  // Standard Test Payment (Tab 2)
  const handleTestPayment = async () => {
    setTesting(true)
    setTestResult(null)
    setTestError(null)

    const payload = {
      idempotencyKey: generateIdempotencyKey(),
      payerVpa: DEMO_VPA.PAYER,
      payeeVpa: DEMO_VPA.PAYEE,
      amount: 500.0,
    }

    const result = await paymentService.createPayment(payload)
    setTesting(false)

    if (result.success && result.data) {
      setTestResult(result.data)
      recordTransaction({
        ...result.data,
        idempotencyKey: payload.idempotencyKey,
        payerVpa: payload.payerVpa,
        payeeVpa: payload.payeeVpa,
      })
      message.info(`Payment completed with status: ${result.data.status}`)
    } else {
      setTestError(result.error || 'Payment execution failed')
    }
  }

  const activeMeta = FAILURE_SCENARIOS[activeScenario] || FAILURE_SCENARIOS.NORMAL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <Card
        style={{
          borderRadius: 8,
          background: 'linear-gradient(135deg, #0a192f 0%, #1e293b 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <Space orientation="horizontal" size={10} style={{ marginBottom: 8 }}>
              <ThunderboltOutlined style={{ fontSize: 24, color: '#38bdf8' }} />
              <Title level={4} style={{ color: '#ffffff', margin: 0 }}>
                Banking Resilience & Scenario Showcase
              </Title>
            </Space>
            <Paragraph style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>
              Simulate distributed system failures across virtual banking microservices (port 8081).
              Observe how the orchestrator (port 8080) handles network uncertainty, prevents duplicate debits,
              triggers automated compensating reversals, and resolves timed-out transactions safely.
            </Paragraph>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                padding: '12px 16px',
                borderRadius: 8,
                display: 'inline-block',
                textAlign: 'left',
              }}
            >
              <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                CURRENT ACTIVE SCENARIO (:8081)
              </Text>
              <Text strong style={{ fontSize: 18, color: '#38bdf8' }}>
                {activeMeta.name}
              </Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={activeMeta.tagColor}>{activeScenario}</Tag>
                <Text style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Outcome &rarr; <strong>{activeMeta.orchestratorOutcome}</strong>
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabs: Interactive Showcase Mode vs Configuration */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'showcase',
            label: (
              <Space>
                <PlayCircleOutlined style={{ color: '#1677ff' }} />
                <span>Interactive Showcase & Demo Playbook</span>
              </Space>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* How to show instructions banner */}
                <Alert
                  type="info"
                  showIcon
                  icon={<CompassOutlined />}
                  message="Presenter & Demonstration Guide"
                  description={
                    <div>
                      <Paragraph style={{ margin: '4px 0 8px 0', fontSize: 13 }}>
                        Use this section to demonstrate the platform to colleagues or interviewers.
                        Each card represents one of the 5 real-world banking scenarios with a <strong>1-Click Live Demonstration</strong>,
                        visual sequence pipeline, and talking points explaining the distributed systems concepts.
                      </Paragraph>
                      <Space>
                        <Button
                          size="small"
                          danger
                          icon={<RollbackOutlined />}
                          onClick={handleReset}
                          loading={resetting}
                        >
                          Reset Simulation to NORMAL
                        </Button>
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={refreshScenario}
                        >
                          Refresh Active State
                        </Button>
                      </Space>
                    </div>
                  }
                />

                {/* Grid of Interactive Scenario Showcase Cards */}
                <Row gutter={[24, 24]}>
                  {Object.values(FAILURE_SCENARIOS).map((scenario) => {
                    const isRunning = demoRunningScenario === scenario.key
                    const isCurrentlyActive = activeScenario === scenario.key
                    const demoResult = demoResults[scenario.key]

                    return (
                      <Col xs={24} key={scenario.key}>
                        <Card
                          style={{
                            borderRadius: 8,
                            border: isCurrentlyActive ? '2px solid #1677ff' : '1px solid #e2e8f0',
                            boxShadow: isCurrentlyActive
                              ? '0 4px 12px rgba(22, 119, 255, 0.12)'
                              : '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                        >
                          {/* Card Header */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            <Space size={10} wrap>
                              <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                                {scenario.name}
                              </Title>
                              <Tag color={scenario.tagColor} style={{ fontWeight: 600 }}>
                                {scenario.key}
                              </Tag>
                              {isCurrentlyActive && (
                                <Tag color="blue" style={{ fontWeight: 600 }}>
                                  ACTIVE IN VIRTUAL BANK
                                </Tag>
                              )}
                              <Tag color="cyan">
                                Concept: {scenario.interviewHighlight}
                              </Tag>
                            </Space>

                            <Space>
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleRunLiveDemo(scenario.key)}
                                loading={isRunning}
                                size="middle"
                                style={{
                                  backgroundColor: isCurrentlyActive ? '#1677ff' : undefined,
                                }}
                              >
                                {isRunning ? 'Running Live Simulation...' : 'Run Live Demonstration'}
                              </Button>
                            </Space>
                          </div>

                          <Paragraph style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                            {scenario.description}
                          </Paragraph>

                          {/* Visual Pipeline Steps */}
                          <div
                            style={{
                              backgroundColor: '#f8fafc',
                              padding: '16px 20px',
                              borderRadius: 8,
                              border: '1px solid #f1f5f9',
                              marginBottom: 16,
                            }}
                          >
                            <Text strong style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 12 }}>
                              EXECUTION SEQUENCE PIPELINE
                            </Text>

                            <Row gutter={[12, 12]}>
                              {scenario.pipelineSteps.map((step, idx) => (
                                <Col xs={24} sm={12} md={scenario.pipelineSteps.length > 4 ? 4 : 6} key={idx}>
                                  <div
                                    style={{
                                      backgroundColor: '#ffffff',
                                      padding: '10px 12px',
                                      borderRadius: 6,
                                      border: '1px solid #e2e8f0',
                                      height: '100%',
                                    }}
                                  >
                                    <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                                      {step.step}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                      {step.target}
                                    </Text>
                                    <div style={{ marginTop: 6 }}>
                                      <Tag
                                        color={
                                          step.status.includes('SUCCESS')
                                            ? 'green'
                                            : step.status.includes('PENDING') || step.status.includes('COMMITTED')
                                            ? 'orange'
                                            : step.status.includes('REVERSED')
                                            ? 'purple'
                                            : 'red'
                                        }
                                        style={{ fontSize: 11 }}
                                      >
                                        {step.status}
                                      </Tag>
                                    </div>
                                    <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                                      {step.note}
                                    </Text>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </div>

                          {/* Live Demonstration Result Card (if run) */}
                          {demoResult && (
                            <div style={{ marginBottom: 16 }}>
                              <Alert
                                type={
                                  demoResult.status === 'SUCCESS'
                                    ? 'success'
                                    : demoResult.status === 'PENDING'
                                    ? 'warning'
                                    : demoResult.status === 'REVERSED'
                                    ? 'info'
                                    : 'error'
                                }
                                showIcon
                                message={
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                      Live Result: <strong>{demoResult.status}</strong>
                                    </span>
                                    <StatusBadge status={demoResult.status} />
                                  </div>
                                }
                                description={
                                  <div style={{ marginTop: 8 }}>
                                    <Descriptions bordered size="small" column={2}>
                                      <Descriptions.Item label="Transaction ID">
                                        <Text code strong>{demoResult.transactionId}</Text>
                                      </Descriptions.Item>
                                      <Descriptions.Item label="Amount">
                                        {formatCurrency(demoResult.amount)}
                                      </Descriptions.Item>
                                      <Descriptions.Item label="Backend Message" span={2}>
                                        <Text strong>{demoResult.message}</Text>
                                      </Descriptions.Item>
                                    </Descriptions>

                                    {/* Special Interactive Step for Timeout Scenario */}
                                    {scenario.key === 'PAYEE_TIMEOUT_AFTER_CREDIT' && (
                                      <div
                                        style={{
                                          marginTop: 12,
                                          padding: '12px 14px',
                                          backgroundColor: '#ffffff',
                                          borderRadius: 6,
                                          border: '1px solid #ffd591',
                                        }}
                                      >
                                        <Text strong style={{ color: '#d46b08', display: 'block', marginBottom: 4 }}>
                                          Demonstration Step 2: Payee Committed Credit vs Orchestrator Timeout
                                        </Text>
                                        <Paragraph style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                                          Virtual Payee Bank (:8081) confirmed credit into Bob's account, but orchestrator's 1000ms read-timeout elapsed.
                                          Status is safely in <strong>PENDING</strong> (no blind credit retry or reversal).
                                        </Paragraph>

                                        <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                                          {demoResult.status === 'PENDING' ? (
                                            <Button
                                              type="primary"
                                              icon={<SafetyCertificateOutlined />}
                                              onClick={() =>
                                                handleInlineRecover(scenario.key, demoResult.transactionId)
                                              }
                                              loading={recoveringTx === demoResult.transactionId}
                                              style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                                            >
                                              Click to Resolve via Safe Recovery (:8080/recover)
                                            </Button>
                                          ) : (
                                            <Tag color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
                                              Payment Safely Recovered to SUCCESS!
                                            </Tag>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                }
                              />
                            </div>
                          )}

                          {/* Presenter Talking Points Collapsible */}
                          <Collapse
                            ghost
                            items={[
                              {
                                key: 'talking-points',
                                label: (
                                  <Space>
                                    <CommentOutlined style={{ color: '#1677ff' }} />
                                    <Text strong style={{ color: '#1677ff' }}>
                                      Presenter Talking Points (What to explain to your audience)
                                    </Text>
                                  </Space>
                                ),
                                children: (
                                  <div
                                    style={{
                                      backgroundColor: '#f8fafc',
                                      padding: '12px 16px',
                                      borderRadius: 6,
                                      border: '1px solid #e2e8f0',
                                    }}
                                  >
                                    <Paragraph style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                                      {scenario.talkingPoints}
                                    </Paragraph>
                                  </div>
                                ),
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </div>
            ),
          },
          {
            key: 'config',
            label: (
              <Space>
                <ThunderboltOutlined style={{ color: '#1677ff' }} />
                <span>Scenario Administration & Custom Testing</span>
              </Space>
            ),
            children: (
              <Row gutter={[24, 24]}>
                {/* Left: Scenario Selector & Card List */}
                <Col xs={24} lg={15}>
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Available Backend Failure Scenarios</span>
                        <Space>
                          <Button
                            size="small"
                            icon={<ReloadOutlined spin={updating || resetting} />}
                            onClick={refreshScenario}
                          >
                            Refresh
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<RollbackOutlined />}
                            onClick={handleReset}
                            loading={resetting}
                          >
                            Reset to NORMAL
                          </Button>
                        </Space>
                      </div>
                    }
                    style={{ borderRadius: 8 }}
                  >
                    {/* Dropdown Selector */}
                    <div style={{ marginBottom: 20 }}>
                      <Text strong style={{ display: 'block', marginBottom: 8, color: '#334155' }}>
                        Select Scenario from Dropdown:
                      </Text>
                      <Space style={{ width: '100%' }}>
                        <Select
                          style={{ minWidth: 320 }}
                          value={selectedScenario}
                          onChange={(val) => setSelectedScenario(val)}
                          options={Object.values(FAILURE_SCENARIOS).map((s) => ({
                            value: s.key,
                            label: `${s.name} (${s.orchestratorOutcome})`,
                          }))}
                        />
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          onClick={() => handleApplyScenario(selectedScenario)}
                          loading={updating}
                          disabled={selectedScenario === activeScenario}
                        >
                          Apply Scenario
                        </Button>
                      </Space>
                    </div>

                    <Divider orientation="left" style={{ fontSize: 13, color: '#64748b' }}>
                      Supported Scenarios & Explanations
                    </Divider>

                    {/* Interactive Scenario Cards */}
                    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                      {Object.values(FAILURE_SCENARIOS).map((scenario) => {
                        const isCurrent = scenario.key === activeScenario
                        const isSelected = scenario.key === selectedScenario

                        return (
                          <div
                            key={scenario.key}
                            onClick={() => setSelectedScenario(scenario.key)}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 8,
                              border: isCurrent
                                ? '2px solid #1677ff'
                                : isSelected
                                ? '2px dashed #93c5fd'
                                : '1px solid #e2e8f0',
                              backgroundColor: isCurrent ? '#f0f7ff' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <Space size={8}>
                                <Text strong style={{ fontSize: 14, color: isCurrent ? '#1677ff' : '#0f172a' }}>
                                  {scenario.name}
                                </Text>
                                <Tag color={scenario.tagColor}>{scenario.key}</Tag>
                                {isCurrent && (
                                  <Tag color="blue" style={{ fontWeight: 600 }}>
                                    ACTIVE NOW
                                  </Tag>
                                )}
                              </Space>

                              {!isCurrent && (
                                <Button
                                  size="small"
                                  type={isSelected ? 'primary' : 'default'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleApplyScenario(scenario.key)
                                  }}
                                  loading={updating && selectedScenario === scenario.key}
                                >
                                  Activate
                                </Button>
                              )}
                            </div>

                            <Paragraph style={{ margin: '4px 0 6px 0', fontSize: 13, color: '#475569' }}>
                              {scenario.description}
                            </Paragraph>

                            <div
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#f8fafc',
                                borderRadius: 6,
                                border: '1px solid #f1f5f9',
                                fontSize: 12,
                                color: '#64748b',
                              }}
                            >
                              <strong style={{ color: '#334155' }}>Workflow: </strong>
                              {scenario.behavior}
                            </div>
                          </div>
                        )
                      })}
                    </Space>
                  </Card>
                </Col>

                {/* Right: Active Scenario Inspector & Quick Live Test */}
                <Col xs={24} lg={9}>
                  <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                    <Card title="Active Simulation Specifications" style={{ borderRadius: 8 }}>
                      <Descriptions size="small" column={1} bordered>
                        <Descriptions.Item label="Scenario Key">
                          <Tag color={activeMeta.tagColor} style={{ fontWeight: 600 }}>
                            {activeMeta.key}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Target Port">
                          <code>http://localhost:8081</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="Expected Status">
                          <StatusBadge status={activeMeta.orchestratorOutcome} size="small" />
                        </Descriptions.Item>
                        <Descriptions.Item label="Recovery Required">
                          {activeMeta.recoveryNeeded ? (
                            <Tag color="orange">Yes (Payee Timeout)</Tag>
                          ) : (
                            <Text type="secondary">No</Text>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Summary">
                          <Text style={{ fontSize: 12 }}>{activeMeta.description}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    <Card
                      title={
                        <Space>
                          <SendOutlined style={{ color: '#1677ff' }} />
                          <span>Test Active Scenario Live</span>
                        </Space>
                      }
                      style={{ borderRadius: 8 }}
                    >
                      <Paragraph style={{ fontSize: 13, color: '#64748b' }}>
                        Triggers a real payment of ₹ 500.00 from <code>alice@demo</code> to <code>bob@demo</code> under the active <strong>{activeScenario}</strong> scenario.
                      </Paragraph>

                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={handleTestPayment}
                        loading={testing}
                        block
                        size="large"
                      >
                        Send Test Payment (:8080)
                      </Button>

                      {testResult && (
                        <div style={{ marginTop: 16 }}>
                          <Alert
                            type={
                              testResult.status === 'SUCCESS'
                                ? 'success'
                                : testResult.status === 'PENDING'
                                ? 'warning'
                                : 'error'
                            }
                            showIcon
                            message={`Result: ${testResult.status}`}
                            description={
                              <div>
                                <Paragraph style={{ margin: '4px 0', fontSize: 12 }}>
                                  {testResult.message}
                                </Paragraph>
                                <Text code style={{ fontSize: 11 }}>
                                  {testResult.transactionId}
                                </Text>
                                {testResult.status === 'PENDING' && (
                                  <div style={{ marginTop: 8 }}>
                                    <Button
                                      size="small"
                                      type="primary"
                                      onClick={() => navigate('/recovery')}
                                      style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
                                    >
                                      Go to Recovery &rarr;
                                    </Button>
                                  </div>
                                )}
                              </div>
                            }
                          />
                        </div>
                      )}

                      {testError && (
                        <div style={{ marginTop: 16 }}>
                          <Alert type="error" showIcon message={testError} />
                        </div>
                      )}
                    </Card>
                  </Space>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  )
}
