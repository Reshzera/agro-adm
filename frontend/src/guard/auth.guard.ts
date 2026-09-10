import { isAxiosError } from 'axios'
import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { authEndpoints } from '../service/auth'

export async function requireSession({ request }: LoaderFunctionArgs) {
  try {
    const { data } = await authEndpoints.session()
    if (data?.session) return data
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error
  }

  const url = new URL(request.url)
  const returnTo = `${url.pathname}${url.search}`
  throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
}
