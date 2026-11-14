import React from 'react'
import { Tag, Badge } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { PAYMENT_STATUS_CONFIG } from '../../utils/constants'

const iconMap = {
  SUCCESS: <CheckCircleOutlined />,
  PENDING: <ClockCircleOutlined />,
  FAILED: <CloseCircleOutlined />,
  REVERSED: <RollbackOutlined />,
  REVERSAL_PENDING: <SyncOutlined spin />,
  INITIATED: <SyncOutlined spin />,
  DEBIT_SUCCESS: <ClockCircleOutlined />,
  PROCESSING: <SyncOutlined spin />,
}

export function StatusBadge({ status, size = 'default', showIcon = true }) {
  const config = PAYMENT_STATUS_CONFIG[status] || {
    label: status || 'UNKNOWN',
    color: 'default',
    badgeStatus: 'default',
    hex: '#8c8c8c',
  }

  const icon = showIcon ? iconMap[status] : null

  return (
    <Tag
      color={config.color}
      icon={icon}
      style={{
        fontWeight: 500,
        fontSize: size === 'small' ? '12px' : '13px',
        padding: size === 'small' ? '1px 8px' : '3px 10px',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {config.label}
    </Tag>
  )
}

