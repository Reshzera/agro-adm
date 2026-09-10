import { Link } from 'react-router-dom'
import { RouteNotice } from '../../components/route-notice/route-notice'

export function NotFoundPage() {
  return <RouteNotice eyebrow="404">
    <h1>Essa porteira não dá para lugar nenhum.</h1>
    <Link to="/app">Voltar à conversa</Link>
  </RouteNotice>
}
