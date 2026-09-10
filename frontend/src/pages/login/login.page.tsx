import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authEndpoints } from "../../service/auth";
import type { SignInWithEmailPayload } from "../../service/auth/responses";
import styles from "./login.page.module.scss";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const returnTo = searchParams.get("returnTo") ?? "/app";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInWithEmailPayload>({
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const signIn = useMutation({
    mutationFn: authEndpoints.signInWithEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      navigate(returnTo, { replace: true });
    },
  });

  return (
    <section className={styles.page} aria-labelledby="login-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>agro adm · acesso seguro</p>
        <h1 id="login-title">
          O dia começa
          <br />
          no campo.
        </h1>
        <p className={styles.lead}>
          Entre no seu caderno para acompanhar o que importa na fazenda.
        </p>
        <div className={styles.fieldNote} aria-hidden="true">
          <span>◒</span>
          <p>
            Dados, decisões e contexto
            <br />
            em um único lugar.
          </p>
        </div>
      </div>
      <div className={styles.cardWrap}>
        <form
          className={styles.card}
          onSubmit={handleSubmit((values) => signIn.mutate(values))}
          noValidate
        >
          <div>
            <p className={styles.cardEyebrow}>Boas-vindas de volta</p>
            <h2>Entrar na fazenda</h2>
            <p className={styles.hint}>Use o e-mail e a senha cadastrados.</p>
          </div>
          <div className={styles.fields}>
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="voce@fazenda.com.br"
              disabled={signIn.isPending}
              {...register("email", {
                required: "Informe seu e-mail.",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Informe um e-mail válido.",
                },
              })}
            />
            {errors.email && (
              <p className={styles.fieldError} role="alert">
                {errors.email.message}
              </p>
            )}
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              disabled={signIn.isPending}
              {...register("password", { required: "Informe sua senha." })}
            />
            {errors.password && (
              <p className={styles.fieldError} role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          <LoginError error={signIn.error} />
          <button type="submit" disabled={signIn.isPending}>
            {signIn.isPending ? "Entrando…" : "Entrar no caderno"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className={styles.returnNote}>
          Ainda não tem acesso? <Link to="/signup">Crie sua conta</Link>.<br />
          Após entrar, você seguirá para <code>{returnTo}</code>.
        </p>
      </div>
    </section>
  );
}

function LoginError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = isAxiosError<{ message?: string }>(error)
    ? (error.response?.data?.message ??
      "Não foi possível entrar. Confira seus dados e tente novamente.")
    : "Não foi possível entrar. Tente novamente em alguns instantes.";
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
