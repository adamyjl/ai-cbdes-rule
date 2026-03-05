import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'

export function PageScaffold(props: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <Card bordered style={{ background: '#ffffff', borderColor: 'rgba(24, 24, 27, 0.12)' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {props.title}
        </Typography.Title>
        <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: 'rgba(24, 24, 27, 0.72)' }}>
          {props.description}
        </Typography.Paragraph>
      </Card>
      <div className="grid gap-4 md:grid-cols-12">{props.children}</div>
    </div>
  )
}
