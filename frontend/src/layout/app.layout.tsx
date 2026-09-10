import { Link, Outlet, useLocation } from 'react-router-dom'
import styles from './app.layout.module.scss'

export function AppLayout() {
  const location = useLocation()
  const inApp = location.pathname === '/app' || location.pathname.startsWith('/app/')

  return <main className={styles.shell}>
    <header className={styles.header}>
      <Link className={styles.brand} to={inApp ? '/app' : '/'}>
        <span className={styles.brandMark} aria-hidden="true">A</span>
        <span>caderno da fazenda</span>
      </Link>
      {inApp && <nav aria-label="Navegação principal">
        <Link data-active={location.pathname === '/app'} to="/app">Conversas</Link>
        <Link data-active={location.pathname === '/app/configuracoes'} to="/app/configuracoes">Fazenda</Link>
      </nav>}
    </header>
    <Outlet />
  </main>
}
