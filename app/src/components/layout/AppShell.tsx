import type { ReactNode } from 'react'
import { ConfigProvider, Layout, theme } from 'antd'
import { useEffect, useMemo } from 'react'
import { TopBar } from './TopBar'
import { useArchiveStore } from '../../store/archiveStore'
import { useLocation } from 'react-router-dom'

export function AppShell(props: { children: ReactNode }) {
  const bootstrapArchives = useArchiveStore((s) => s.bootstrap)
  const location = useLocation()
  const isMllm = location.pathname === '/mllm' || location.pathname.startsWith('/mllm/')
  const isLanding = location.pathname === '/'

  useEffect(() => {
    bootstrapArchives()
  }, [bootstrapArchives])

  const antdTheme = useMemo(
    () => ({
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: 'rgb(95, 2, 107)',
        colorBgBase: '#ffffff',
        colorTextBase: 'rgb(24, 24, 27)',
        colorBorder: '#e5e7eb'
      }
    }),
    []
  )

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout style={{ minHeight: '100dvh' }}>
        <Layout>
          {!isMllm && !isLanding && (
            <Layout.Header style={{ padding: 0, height: 'auto', background: 'rgb(95, 2, 107)' }}>
              <TopBar />
            </Layout.Header>
          )}
          <Layout.Content style={{ padding: isMllm ? 0 : 24, background: '#ffffff' }}>
            {props.children}
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
