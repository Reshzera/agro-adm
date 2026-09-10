import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { authEndpoints } from '../../service/auth'
import type { SignUpWithEmailPayload } from '../../service/auth/responses'
import styles from '../login/login.page.module.scss'

export function SignupPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpWithEmailPayload>({
    defaultValues: { name: '', email: '', password: '' },
  })
  const signUp = useMutation({ mutationFn: authEndpoints.signUpWithEmail })

  return <section className={styles.page} aria-labelledby="signup-title">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>agro adm · primeiro acesso</p>
      <h1 id="signup-title">Sua fazenda,<br />em movimento.</h1>
      <p className={styles.lead}>Crie seu acesso e comece a organizar a rotina que mantém a propriedade produtiva.</p>
      <div className={styles.fieldNote} aria-hidden="true"><span>◒</span><p>Um caderno vivo para<br />cada decisão do campo.</p></div>
    </div>
    <div className={styles.cardWrap}>
      {signUp.isSuccess ? <SignupSuccess /> : <form className={styles.card} onSubmit={handleSubmit((values) => signUp.mutate({ ...values, callbackURL: `${window.location.origin}/verificar-email?verified=true` }))} noValidate>
        <div><p className={styles.cardEyebrow}>Comece por aqui</p><h2>Criar uma conta</h2><p className={styles.hint}>Leva menos de um minuto.</p></div>
        <div className={styles.fields}>
          <label htmlFor="signup-name">Seu nome</label>
          <input id="signup-name" type="text" autoComplete="name" placeholder="Nome e sobrenome" disabled={signUp.isPending} {...register('name', { required: 'Informe seu nome.' })} />
          {errors.name && <p className={styles.fieldError} role="alert">{errors.name.message}</p>}
          <label htmlFor="signup-email">E-mail</label>
          <input id="signup-email" type="email" autoComplete="email" placeholder="voce@fazenda.com.br" disabled={signUp.isPending} {...register('email', { required: 'Informe seu e-mail.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Informe um e-mail válido.' } })} />
          {errors.email && <p className={styles.fieldError} role="alert">{errors.email.message}</p>}
          <label htmlFor="signup-password">Crie uma senha</label>
          <input id="signup-password" type="password" autoComplete="new-password" placeholder="Ao menos 8 caracteres" disabled={signUp.isPending} {...register('password', { required: 'Crie uma senha.', minLength: { value: 8, message: 'Use ao menos 8 caracteres.' } })} />
          {errors.password && <p className={styles.fieldError} role="alert">{errors.password.message}</p>}
        </div>
        <SignupError error={signUp.error} />
        <button type="submit" disabled={signUp.isPending}>{signUp.isPending ? 'Criando conta…' : 'Criar meu acesso'}<span aria-hidden="true">→</span></button>
      </form>}
      <p className={styles.returnNote}>Já tem uma conta? <Link to="/login">Entre por aqui</Link>.</p>
    </div>
  </section>
}

function SignupSuccess() {
  return <div className={styles.card} role="status">
    <div><p className={styles.cardEyebrow}>Conta criada</p><h2>Confira seu e-mail.</h2><p className={styles.hint}>Enviamos uma mensagem de confirmação. Depois de verificar o endereço, você poderá entrar no caderno.</p></div>
    <Link to="/verificar-email">Acompanhar verificação →</Link>
  </div>
}

function SignupError({ error }: { error: unknown }) {
  if (!error) return null
  const message = isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? 'Não foi possível criar sua conta. Tente novamente.'
    : 'Não foi possível criar sua conta. Tente novamente.'
  return <p className={styles.error} role="alert">{message}</p>
}
