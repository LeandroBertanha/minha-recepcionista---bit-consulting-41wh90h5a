import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Bot, Zap, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function Index() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/inbox" replace />
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#f4fcfb_0%,#ffffff_52%,#f1f8f4_100%)] pt-24 pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#39bdb812_1px,transparent_1px),linear-gradient(to_bottom,#39bdb812_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-bit-green/10 blur-3xl" />
        <div className="absolute right-[14%] top-20 h-10 w-10 rotate-45 rounded-lg bg-bit-yellow shadow-lg shadow-bit-yellow/20" />
        <div className="absolute right-[19%] top-8 h-14 w-14 rotate-45 rounded-xl bg-bit-green shadow-lg shadow-bit-green/20" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-800 mb-8 animate-fade-in-down shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-bit-green mr-2 animate-pulse" />
            Atendimento inteligente para empresas
          </div>
          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-[-0.055em] text-bit-navy sm:text-7xl mb-6 animate-fade-in-up">
            Transforme conversas em{' '}
            <span className="text-brand-500">relacionamentos e vendas.</span>
          </h1>
          <p
            className="mx-auto max-w-2xl text-lg text-slate-600 mb-10 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Centralize o WhatsApp, organize oportunidades e conte com agentes de IA para atender
            melhor — sem perder o controle humano das conversas.
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <Button
              size="lg"
              className="bg-brand-500 hover:bg-brand-600 h-14 px-8 text-base font-bold w-full sm:w-auto shadow-lg shadow-brand-500/25"
              asChild
            >
              <Link to="/register">
                Conheça a BitZaap <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold w-full sm:w-auto border-slate-300 text-bit-navy hover:bg-brand-50 hover:text-brand-800"
              asChild
            >
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>

        {/* Mockup Preview */}
        <div
          className="container mx-auto px-4 mt-20 animate-slide-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
            </div>
            <div className="flex h-[400px] sm:h-[560px] w-full">
              <div className="w-1/3 border-r border-slate-100 bg-slate-50 p-4 hidden sm:block">
                <div className="h-10 w-full rounded-md bg-white border border-slate-200 mb-6"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white shadow-sm border border-slate-100"
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-slate-200 rounded"></div>
                        <div className="h-3 w-full bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-br from-brand-50 to-white p-6 flex flex-col justify-end gap-4 relative">
                <div className="absolute left-8 top-8 rounded-2xl border border-brand-100 bg-white/90 px-5 py-4 text-left shadow-sm backdrop-blur-sm">
                  <span className="block text-xs font-bold uppercase tracking-wider text-brand-600">
                    BitZaap IA
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-bit-navy">
                    Agente ativo e acompanhando
                  </span>
                </div>
                <div className="relative z-10 self-start max-w-md rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-slate-700 shadow-sm">
                  Ei, como funciona a nova integração?
                </div>
                <div className="relative z-10 self-end max-w-md rounded-2xl rounded-tr-sm bg-brand-500 px-4 py-3 text-white shadow-sm">
                  Olá! Centralizamos seu atendimento e a IA já pode ajudar sua equipe. Como posso
                  apoiar você hoje?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Tudo o que você precisa, nada além disso
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-2">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-bit-navy">Conexão simples</h3>
              <p className="text-slate-600">
                Vincule o número por QR Code e concentre as conversas em um único ambiente.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-green-100 text-bit-green flex items-center justify-center mb-2">
                <MessagesSquare className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-bit-navy">Atendimento organizado</h3>
              <p className="text-slate-600">
                Inbox em tempo real e pipeline para acompanhar cada oportunidade do início ao fim.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-bit-navy">IA com controle humano</h3>
              <p className="text-slate-600">
                Configure agentes, pause a automação quando quiser e mantenha sua equipe no comando.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
