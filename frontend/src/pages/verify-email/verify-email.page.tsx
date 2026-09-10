import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { authEndpoints } from '../../service/auth'
import styles from '../login/login.page.module.scss'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const verified = params.get('verified') === 'true'
  const error = params.get('error')
  const { register, handleSubmit } = useForm<{ email: string }>({ defaultValues: { email: params.get('email') ?? '' } })
  const resend = useMutation({ mutationFn: ({ email }: { email: string }) => authEndpoints.sendVerificationEmail(email) })

  return <section className={styles.page} aria-labelledby="verify-title">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>agro adm · confirmação</p>
      <h1 id="verify-title">Confirme<br />seu endereço.</h1>
      <p className={styles.lead}>Uma etapa curta para manter os dados da sua fazenda protegidos.</p>
    </div>
    <div className={styles.cardWrap}>
      <div className={styles.card}>
        {verified && !error ? <><div><p className={styles.cardEyebrow}>E-mail confirmado</p><h2>Está tudo certo.</h2><p className={styles.hint}>Seu endereço foi verificado e o caderno já pode ser acessado.</p></div><Link to="/login">Entrar no caderno →</Link></> : <>
          <div><p className={styles.cardEyebrow}>{error ? 'Link inválido' : 'Confira sua caixa de entrada'}</p><h2>{error ? 'Não foi possível confirmar.' : 'Enviamos um link.'}</h2><p className={styles.hint}>{error ? 'O link pode ter expirado. Solicite uma nova mensagem abaixo.' : 'Abra a mensagem de confirmação. Se não encontrar, confira também o spam.'}</p></div>
          <form className={styles.fields} onSubmit={handleSubmit((values) => resend.mutate(values))}>
            <label htmlFor="verify-email">Reenviar para</label><input id="verify-email" type="email" required placeholder="voce@fazenda.com.br" {...register('email')} />
            <button type="submit" disabled={resend.isPending}>{resend.isPending ? 'Enviando…' : resend.isSuccess ? 'Mensagem enviada ✓' : 'Reenviar confirmação'}</button>
          </form>
        </>}
      </div>
      <p className={styles.returnNote}><Link to="/login">Voltar para o login</Link></p>
    </div>
  </section>
}

