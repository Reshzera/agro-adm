import { Link } from 'react-router-dom'
import styles from './landing.page.module.scss'

export function LandingPage() {
  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>Gestão rural · do seu jeito</p>
        <h1 id="landing-title">A fazenda<br />fala. A gente<br /><em>organiza.</em></h1>
        <p className={styles.lead}>Registre receitas, despesas e decisões em conversa ou no livro-caixa. O contexto da propriedade fica junto, claro e sob seu controle.</p>
        <div className={styles.actions}><Link className={styles.primary} to="/signup">Começar meu caderno <span>→</span></Link><Link to="/login">Já tenho acesso</Link></div>
      </div>
      <div className={styles.composition} aria-label="Exemplo do caderno financeiro">
        <div className={styles.sun} />
        <article className={styles.note}><span>HOJE · 06:42</span><p>“Anota 4.800 de diesel para o trator.”</p><b>✓ Despesa registrada</b></article>
        <article className={styles.result}><span>RESULTADO DO MÊS</span><strong>R$ 71.100</strong><small>receitas menos despesas</small></article>
        <div className={styles.fieldLines}><i /><i /><i /><i /></div>
      </div>
    </section>

    <section className={styles.benefits} aria-labelledby="benefits-title">
      <header><p className={styles.kicker}>Um caderno que trabalha</p><h2 id="benefits-title">Menos memória.<br />Mais <em>clareza.</em></h2></header>
      <div className={styles.benefitGrid}>
        <article><span>01</span><h3>Fale como sempre</h3><p>Registre pelo chat usando a linguagem da rotina, sem decorar telas ou categorias.</p></article>
        <article><span>02</span><h3>Confira os números</h3><p>Receitas, despesas e resultado aparecem em um livro-caixa direto e editável.</p></article>
        <article><span>03</span><h3>Você corrige o contexto</h3><p>Veja e edite o que o assistente aprendeu. Nada fica escondido ou fora do seu alcance.</p></article>
      </div>
    </section>

    <section className={styles.closing}><p>Da porteira ao fechamento do mês.</p><h2>Seu trabalho já tem história.<br /><em>Dê a ele um bom caderno.</em></h2><Link className={styles.primary} to="/signup">Criar conta gratuita <span>→</span></Link></section>
  </div>
}

