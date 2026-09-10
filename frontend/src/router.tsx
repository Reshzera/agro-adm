import { createBrowserRouter, Navigate } from 'react-router-dom'
import { requireSession } from './guard/auth.guard'
import { AppLayout } from './layout/app.layout'
import { ChatPage } from './pages/chat/chat.page'
import { LoginPage } from './pages/login/login.page'
import { SignupPage } from './pages/signup/signup.page'
import { NotFoundPage } from './pages/not-found/not-found.page'
import { FarmSettingsPage } from './pages/settings/farm-settings.page'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
