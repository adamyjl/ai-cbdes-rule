import type { ReactNode } from 'react'
import { ConfigProvider, Layout, theme } from 'antd'
import { useEffect, useMemo } from 'react'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
import { useArchiveStore } from '../../store/archiveStore'

export function AppShell(props: { children: ReactNode }) {
  const bootstrapArchives = useArchiveStore((s) => s.bootstrap)

  useEffect(() => {
    bootstrapArchives()
  }, [bootstrapArchives])

  const antdTheme = useMemo(
    () => ({
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#22c55e',
        colorBgBase: '#09090b',
        colorTextBase: '#fafafa',
        colorBorder: '#27272a'
      }
    }),
    []
  )

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout style={{ minHeight: '100dvh' }}>
        <Layout.Sider width={288} breakpoint="md" collapsedWidth={0} theme="dark">
          <div style={{ padding: 16 }}>
            <SidebarNav />
          </div>
        </Layout.Sider>
        <Layout>
          <Layout.Header style={{ padding: 0, height: 'auto', background: 'rgba(9, 9, 11, 0.85)' }}>
            <TopBar />
          </Layout.Header>
          <Layout.Content style={{ padding: 24 }}>{props.children}</Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
