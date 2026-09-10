import type { ReactNode } from 'react'
import styles from './route-notice.module.scss'

type RouteNoticeProps = {
  eyebrow: string
  children: ReactNode
}

export function RouteNotice({ eyebrow, children }: RouteNoticeProps) {
  return <section className={styles.notice}>
    <p className={styles.eyebrow}>{eyebrow}</p>
    {children}
  </section>
}
