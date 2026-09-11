import { createBrowserRouter } from 'react-router-dom'
import { requireSession } from './guard/auth.guard'
import { AppLayout } from './layout/app.layout'
import { ChatPage } from './pages/chat/chat.page'
import { LoginPage } from './pages/login/login.page'
import { SignupPage } from './pages/signup/signup.page'
import { NotFoundPage } from './pages/not-found/not-found.page'
import { FarmSettingsPage } from './pages/settings/farm-settings.page'
import { FinancialPage } from './pages/financial/financial.page'
import { LandingPage } from './pages/landing/landing.page'
import { VerifyEmailPage } from './pages/verify-email/verify-email.page'
import { CattlePage } from './pages/cattle/cattle.page'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'verificar-email', element: <VerifyEmailPage /> },
      {
        path: 'app',
        loader: requireSession,
        element: <ChatPage />,
      },
      {
        path: 'app/configuracoes',
        loader: requireSession,
        element: <FarmSettingsPage />,
      },
      {
        path: 'app/financeiro',
        loader: requireSession,
        element: <FinancialPage />,
      },
      {
        path: 'app/rebanho',
        loader: requireSession,
        element: <CattlePage />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
