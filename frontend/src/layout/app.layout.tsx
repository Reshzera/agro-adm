import { Outlet } from 'react-router-dom'
import styles from './app.layout.module.scss'

export function AppLayout() {
  return <main className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.brandMark} aria-hidden="true">A</div>
      <p>caderno da fazenda</p>
    </header>
    <Outlet />
  </main>
}
