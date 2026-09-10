import { useSearchParams } from 'react-router-dom'
import { RouteNotice } from '../../components/route-notice/route-notice'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/app'

  return <RouteNotice eyebrow="sessão necessária">
    <h1>Entre para abrir o caderno da fazenda.</h1>
    <p>A autenticação é feita pelo Better Auth. Depois de entrar, volte para <code>{returnTo}</code>.</p>
  </RouteNotice>
}
