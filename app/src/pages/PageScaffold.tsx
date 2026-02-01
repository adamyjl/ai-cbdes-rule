import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'

export function PageScaffold(props: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <Card bordered={false} style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {props.title}
        </Typography.Title>
        <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: 'rgba(244,244,245,0.72)' }}>
          {props.description}
        </Typography.Paragraph>
      </Card>
      <div className="grid gap-4 md:grid-cols-12">{props.children}</div>
    </div>
  )
}
