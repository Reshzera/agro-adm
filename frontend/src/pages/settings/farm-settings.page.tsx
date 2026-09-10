import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { farmEndpoints } from '../../service/farm'
import type { UpdateFarmPayload } from '../../service/farm/payloads'
import type { Farm } from '../../service/farm/responses'
import styles from './farm-settings.page.module.scss'

type FarmForm = {
  name: string
  totalAreaHa: string
  primaryActivity: string
  location: string
  mainCrops: string
  approximateAnimalCount: string
  agentContext: string
}

function formValues(farm: Farm): FarmForm {
  return {
    name: farm.name ?? '',
    totalAreaHa: farm.totalAreaHa ?? '',
    primaryActivity: farm.primaryActivity ?? '',
    location: farm.location ?? '',
    mainCrops: farm.mainCrops ?? '',
    approximateAnimalCount: farm.approximateAnimalCount?.toString() ?? '',
    agentContext: farm.agentContext ?? '',
  }
}

function nullable(value: string): string | null {
  return value.trim() || null
}

function payload(values: FarmForm): UpdateFarmPayload {
  return {
    name: nullable(values.name),
    totalAreaHa: nullable(values.totalAreaHa),
    primaryActivity: nullable(values.primaryActivity),
    location: nullable(values.location),
    mainCrops: nullable(values.mainCrops),
    approximateAnimalCount: values.approximateAnimalCount
      ? Number(values.approximateAnimalCount)
      : null,
    agentContext: nullable(values.agentContext),
  }
}

export function FarmSettingsPage() {
  const queryClient = useQueryClient()
  const farm = useQuery({
    queryKey: ['farm'],
    queryFn: async ({ signal }) => (await farmEndpoints.current(signal)).data,
  })
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FarmForm>()
  const update = useMutation({
    mutationFn: (values: FarmForm) => farmEndpoints.update(payload(values)),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['farm'], data)
      reset(formValues(data))
    },
  })

  useEffect(() => {
    if (farm.data) reset(formValues(farm.data))
  }, [farm.data, reset])

  if (farm.isPending) return <p className={styles.status}>Abrindo a caderneta da propriedade…</p>
  if (farm.isError) return <p className={styles.error}>Não foi possível carregar os dados da fazenda.</p>

  return <section className={styles.page}>
    <header className={styles.intro}>
      <div>
        <p className={styles.kicker}>Configurações · propriedade</p>
        <h1>O retrato da<br /><em>sua fazenda.</em></h1>
      </div>
      <aside className={styles.completeness} data-complete={farm.data.onboardingCompleted}>
        <span aria-hidden="true">{farm.data.onboardingCompleted ? '✓' : '!'}</span>
        <div>
          <strong>{farm.data.onboardingCompleted ? 'Cadastro essencial completo' : 'Cadastro ainda incompleto'}</strong>
          <p>{farm.data.onboardingCompleted
            ? 'O assistente não voltará a perguntar estes dados.'
            : 'Preencha os quatro campos essenciais ou continue pelo chat.'}</p>
        </div>
      </aside>
    </header>

    <form className={styles.form} onSubmit={handleSubmit((values) => update.mutate(values))}>
      <section className={styles.card} aria-labelledby="essential-title">
        <div className={styles.sectionNumber}>01</div>
        <div className={styles.sectionBody}>
          <header>
            <h2 id="essential-title">Dados essenciais</h2>
            <p>São as referências que o assistente usa para situar cada conversa.</p>
          </header>
          <div className={styles.grid}>
            <label className={styles.wide}>
              <span>Nome da fazenda</span>
              <input {...register('name', { required: 'Informe o nome da fazenda.' })} placeholder="Fazenda Santa Clara" />
              {errors.name && <small>{errors.name.message}</small>}
            </label>
            <label>
              <span>Área aproximada</span>
              <div className={styles.suffixedInput}>
                <input inputMode="decimal" {...register('totalAreaHa', {
                  required: 'Informe a área aproximada.',
                  pattern: { value: /^\d+(?:[.,]\d{1,2})?$/, message: 'Use um número com até duas casas decimais.' },
                  setValueAs: (value: string) => value.replace(',', '.'),
                })} placeholder="840" />
                <b>ha</b>
              </div>
              {errors.totalAreaHa && <small>{errors.totalAreaHa.message}</small>}
            </label>
            <label>
              <span>Localização</span>
              <input {...register('location', { required: 'Informe a localização.' })} placeholder="Camapuã, MS" />
              {errors.location && <small>{errors.location.message}</small>}
            </label>
            <label className={styles.wide}>
              <span>Atividade principal</span>
              <input list="primary-activities" {...register('primaryActivity', { required: 'Informe a atividade principal.' })} placeholder="Pecuária, agricultura ou mista" />
              <datalist id="primary-activities">
                <option value="Pecuária" />
                <option value="Agricultura" />
                <option value="Mista" />
              </datalist>
              {errors.primaryActivity && <small>{errors.primaryActivity.message}</small>}
            </label>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="production-title">
        <div className={styles.sectionNumber}>02</div>
        <div className={styles.sectionBody}>
          <header>
            <h2 id="production-title">Produção</h2>
            <p>Estimativas bastam. Estes valores podem mudar ao longo do ciclo.</p>
          </header>
          <div className={styles.grid}>
            <label>
              <span>Principais culturas</span>
              <input {...register('mainCrops')} placeholder="Milho, soja, sorgo" />
            </label>
            <label>
              <span>Quantidade de animais</span>
              <input type="number" min="0" step="1" {...register('approximateAnimalCount', {
                min: { value: 0, message: 'A quantidade não pode ser negativa.' },
              })} placeholder="920" />
              {errors.approximateAnimalCount && <small>{errors.approximateAnimalCount.message}</small>}
            </label>
          </div>
        </div>
      </section>

      <section className={`${styles.card} ${styles.contextCard}`} aria-labelledby="context-title">
        <div className={styles.sectionNumber}>03</div>
        <div className={styles.sectionBody}>
          <header>
            <h2 id="context-title">O que o assistente aprendeu</h2>
            <p>Contexto qualitativo visível e editável. Corrija ou apague qualquer interpretação equivocada.</p>
          </header>
          <label>
            <span className={styles.visuallyHidden}>Contexto do assistente</span>
            <textarea rows={9} {...register('agentContext')} placeholder={'# Minha fazenda\n\n- Trabalhamos com gado Nelore.\n- João é o gerente.'} />
          </label>
        </div>
      </section>

      <footer className={styles.actions}>
        <p aria-live="polite">
          {update.isError ? 'Não foi possível salvar. Revise os dados e tente novamente.' :
            update.isSuccess && !isDirty ? 'Alterações salvas.' :
              isDirty ? 'Há alterações ainda não salvas.' : 'Tudo em dia.'}
        </p>
        <button type="submit" disabled={update.isPending || !isDirty}>
          {update.isPending ? 'Salvando…' : 'Salvar dados'}
        </button>
      </footer>
    </form>
  </section>
}
