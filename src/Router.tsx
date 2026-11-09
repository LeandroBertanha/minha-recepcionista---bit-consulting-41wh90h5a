import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const LandingPage = lazy(() => import('./landing/LandingPage'))
const LegalPage = lazy(() => import('./landing/LegalPage'))
const DashboardApp = lazy(() => import('./App'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return <div className="min-h-screen bg-white" aria-busy="true" />
}

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacidade" element={<LegalPage kind="privacy" />} />
          <Route path="/termos" element={<LegalPage kind="terms" />} />
          <Route path="/app/*" element={<DashboardApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
