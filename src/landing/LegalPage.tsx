import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { landingConfig } from './landing.config'

const content = {
  privacy: {
    title: 'Política de Privacidade',
    sections: [
      {
        heading: 'Quais dados coletamos',
        text: 'Ao fazer o diagnóstico gratuito, coletamos seu nome, WhatsApp, e-mail, o nome e o segmento da sua empresa e as respostas sobre o seu atendimento. Também registramos a origem da visita (como campanhas e páginas de referência).',
      },
      {
        heading: 'Como usamos os dados',
        text: 'Usamos essas informações para gerar o diagnóstico, recomendar o plano mais adequado e entrar em contato sobre a plataforma, conforme a autorização dada no formulário.',
      },
      {
        heading: 'Compartilhamento',
        text: 'Os dados podem ser processados por ferramentas de CRM, análise e inteligência artificial contratadas para operar o serviço. Não vendemos dados pessoais.',
      },
      {
        heading: 'Seus direitos',
        text: 'Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados e revogar a autorização de contato a qualquer momento pelos nossos canais de atendimento.',
      },
    ],
  },
  terms: {
    title: 'Termos de Uso',
    sections: [
      {
        heading: 'Sobre o serviço',
        text: `${landingConfig.productName} é uma plataforma de atendimento automatizado para WhatsApp com inteligência artificial, oferecida pela ${landingConfig.companyName}.`,
      },
      {
        heading: 'Diagnóstico gratuito',
        text: 'O diagnóstico é uma recomendação baseada nas informações fornecidas e não representa garantia de resultados.',
      },
      {
        heading: 'Contratação e cancelamento',
        text: 'As condições comerciais, os limites de uso e as regras de cancelamento de cada plano são apresentados no momento da contratação.',
      },
      {
        heading: 'Uso do WhatsApp',
        text: 'O uso da plataforma deve respeitar as políticas do WhatsApp e a legislação aplicável, inclusive sobre o envio de mensagens e o tratamento de dados dos seus clientes.',
      },
    ],
  },
} as const

export default function LegalPage({ kind }: { kind: keyof typeof content }) {
  const page = content[kind]

  useEffect(() => {
    document.title = `${page.title} | ${landingConfig.productName}`
  }, [page.title])

  return (
    <main className="min-h-screen bg-white font-landing text-ink">
      <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </a>
        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.03em]">{page.title}</h1>
        <p className="mt-3 font-machine text-[11px] uppercase tracking-[0.14em] text-ink/45">
          Documento modelo · revisão jurídica pendente
        </p>
        <div className="mt-10 space-y-8">
          {page.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-semibold">{s.heading}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{s.text}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
