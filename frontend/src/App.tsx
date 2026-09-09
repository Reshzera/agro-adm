import { useEffect, useState } from 'react'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

type BackendStatus =
  | { state: 'loading' }
  | { state: 'up'; service: string }
  | { state: 'down'; reason: string }

function App() {
  const [status, setStatus] = useState<BackendStatus>({ state: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${BACKEND_URL}/health`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<{ status: string; service: string }>
      })
      .then((body) => setStatus({ state: 'up', service: body.service }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setStatus({ state: 'down', reason: String(error) })
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>agro-adm</h1>
      <p>
        backend em <code>{BACKEND_URL}</code>:{' '}
        {status.state === 'loading' && 'verificando…'}
        {status.state === 'up' && `no ar (${status.service})`}
        {status.state === 'down' && `fora do ar — ${status.reason}`}
      </p>
    </main>
  )
}

export default App
