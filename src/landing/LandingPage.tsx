import { useEffect } from 'react'
import { captureLeadSource, initAnalytics } from './analytics'
import { DiagnosticProvider } from './diagnostic/DiagnosticContext'
import { landingConfig } from './landing.config'
import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { Problem, Segments, Solution } from './sections/Story'
import { HowItWorks } from './sections/HowItWorks'
import { Differentials, Faq, FinalCta, Footer, Pricing, SocialProof } from './sections/Close'

function useStructuredData() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: landingConfig.productName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Chatbot inteligente para WhatsApp que responde clientes, tira dúvidas, conduz vendas e agendamentos 24 horas por dia.',
      url: landingConfig.siteUrl,
      publisher: { '@type': 'Organization', name: landingConfig.companyName },
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [])
}

export default function LandingPage() {
  useStructuredData()

  useEffect(() => {
    initAnalytics({
      gaId: import.meta.env.VITE_GA_ID as string | undefined,
      metaPixelId: import.meta.env.VITE_META_PIXEL_ID as string | undefined,
    })
    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) root.style.scrollBehavior = 'smooth'
    try {
      captureLeadSource(
        window.location.search,
        document.referrer,
        window.location.pathname,
        sessionStorage,
      )
    } catch {
      // sessionStorage indisponível: a origem será recalculada no envio do diagnóstico.
    }
    return () => {
      root.style.scrollBehavior = ''
    }
  }, [])

  return (
    <DiagnosticProvider>
      <div className="overflow-x-clip bg-white font-landing antialiased selection:bg-wa selection:text-ink">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-wa focus:px-4 focus:py-2 focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <Nav />
        <main id="conteudo" className="[&>section]:scroll-mt-20">
          <Hero />
          <Problem />
          <Solution />
          <HowItWorks />
          <Segments />
          <Differentials />
          <Pricing />
          <SocialProof />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </DiagnosticProvider>
  )
}
