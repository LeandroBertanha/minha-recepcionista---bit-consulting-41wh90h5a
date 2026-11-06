import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plug,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  UploadCloud,
  UserCheck,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'

type ViewId =
  | 'dashboard'
  | 'inbox'
  | 'attention'
  | 'agents'
  | 'knowledge'
  | 'journeys'
  | 'quality'
  | 'analytics'
  | 'integrations'
  | 'team'
  | 'settings'

type NavItem = { id: ViewId; label: string; icon: LucideIcon; badge?: string }

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'inbox', label: 'Conversas', icon: MessageCircle, badge: '12' },
  { id: 'attention', label: 'Precisa de você', icon: BellRing, badge: '4' },
  { id: 'agents', label: 'Recepcionistas', icon: Bot },
  { id: 'knowledge', label: 'Conhecimento', icon: BookOpen },
  { id: 'journeys', label: 'Jornadas', icon: Workflow },
  { id: 'quality', label: 'Qualidade', icon: ShieldCheck },
  { id: 'analytics', label: 'Indicadores', icon: BarChart3 },
  { id: 'integrations', label: 'Integrações', icon: Plug },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

const metrics = [
  {
    label: 'Conversas recebidas',
    value: '1.284',
    change: '+12,4%',
    icon: MessageCircle,
    tone: 'teal',
  },
  { label: 'Resolvidas pela IA', value: '78,6%', change: '+6,2%', icon: Sparkles, tone: 'green' },
  { label: 'Transferidas', value: '18,3%', change: '-2,1%', icon: UserCheck, tone: 'yellow' },
  { label: 'SLA cumprido', value: '96,8%', change: '+1,8%', icon: Clock3, tone: 'blue' },
]

const conversations = [
  {
    name: 'Marina Souza',
    text: 'Gostaria de remarcar para sexta...',
    time: 'Agora',
    status: 'IA atendendo',
    unread: 2,
    initials: 'MS',
  },
  {
    name: 'Carlos Eduardo',
    text: 'Preciso falar com uma pessoa.',
    time: '2 min',
    status: 'Aguardando humano',
    unread: 1,
    initials: 'CE',
  },
  {
    name: 'Ana Paula',
    text: 'Obrigada pelo atendimento!',
    time: '8 min',
    status: 'Resolvido',
    unread: 0,
    initials: 'AP',
  },
  {
    name: 'Rafael Lima',
    text: 'Qual o valor da avaliação?',
    time: '14 min',
    status: 'IA atendendo',
    unread: 0,
    initials: 'RL',
  },
  {
    name: 'Beatriz Nunes',
    text: 'Tenho urgência no atendimento.',
    time: '22 min',
    status: 'Prioridade alta',
    unread: 0,
    initials: 'BN',
  },
]

const attentionRows = [
  {
    client: 'Carlos Eduardo',
    reason: 'Solicitou atendimento humano',
    wait: '06:42',
    sla: '3 min',
    priority: 'Alta',
    agent: 'Lia',
  },
  {
    client: 'Beatriz Nunes',
    reason: 'Cliente demonstra frustração',
    wait: '04:18',
    sla: '6 min',
    priority: 'Alta',
    agent: 'Lia',
  },
  {
    client: 'Fernando Alves',
    reason: 'Desconto fora da autonomia',
    wait: '02:51',
    sla: '9 min',
    priority: 'Média',
    agent: 'Maya',
  },
  {
    client: 'Camila Rocha',
    reason: 'Informação não cadastrada',
    wait: '01:36',
    sla: '11 min',
    priority: 'Normal',
    agent: 'Lia',
  },
]

const receptionistCards = [
  {
    name: 'Lia',
    area: 'Atendimento e agendamentos',
    status: 'Ativa',
    conversations: 428,
    quality: '94%',
    version: 'v2.8',
  },
  {
    name: 'Maya',
    area: 'Vendas e qualificação',
    status: 'Ativa',
    conversations: 316,
    quality: '91%',
    version: 'v1.9',
  },
  {
    name: 'Nina',
    area: 'Pós-venda e suporte',
    status: 'Rascunho',
    conversations: 0,
    quality: '—',
    version: 'v0.4',
  },
]

const knowledgeRows = [
  {
    source: 'Catálogo de serviços 2026.pdf',
    category: 'Serviços',
    updated: 'Hoje, 14:20',
    status: 'Ativo',
    pages: 28,
  },
  {
    source: 'Tabela de preços.xlsx',
    category: 'Comercial',
    updated: 'Ontem, 17:42',
    status: 'Ativo',
    pages: 6,
  },
  {
    source: 'Política de cancelamento',
    category: 'Políticas',
    updated: '04 nov. 2026',
    status: 'Ativo',
    pages: 1,
  },
  {
    source: 'Perguntas frequentes',
    category: 'FAQ',
    updated: '30 out. 2026',
    status: 'Revisar',
    pages: 42,
  },
]

const barHeights = [48, 63, 57, 74, 69, 84, 78, 91, 86, 96, 88, 94]

function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300',
  }
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ' + tones[tone]
      }
    >
      {children}
    </span>
  )
}

function App() {
  const [active, setActive] = useState<ViewId>('dashboard')
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(0)

  useEffect(() => {
    const stored = window.localStorage.getItem('minha-recepcionista-theme')
    if (stored === 'dark') setDark(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('minha-recepcionista-theme', dark ? 'dark' : 'light')
  }, [dark])

  const currentLabel = useMemo(
    () => navigation.find((item) => item.id === active)?.label || 'Visão geral',
    [active],
  )

  const selectView = (id: ViewId) => {
    setActive(id)
    setSidebarOpen(false)
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-[#f4fbfa] text-slate-900 transition-colors dark:bg-[#071318] dark:text-slate-100">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={
            'fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col border-r border-slate-200/80 bg-white transition-transform dark:border-white/10 dark:bg-[#0b1c22] lg:translate-x-0 ' +
            (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
          }
        >
          <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/bit-consulting-logo.webp"
                alt="Bit Consulting"
                className="h-11 w-[76px] object-contain"
              />
              <div className="border-l border-slate-200 pl-3 dark:border-white/15">
                <p className="text-[15px] font-extrabold leading-none tracking-tight">
                  Minha <span className="text-[#12bfc3]">Recepcionista</span>
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  WhatsApp com IA
                </p>
              </div>
            </div>
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-4 mt-4 rounded-xl border border-[#12bfc3]/20 bg-[#12bfc3]/[0.06] p-3 dark:bg-[#12bfc3]/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Empresa ativa
            </p>
            <button className="mt-1 flex w-full items-center justify-between text-left text-sm font-semibold">
              Bit Consulting <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-5">
            {navigation.map((item) => {
              const Icon = item.icon
              const selected = active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => selectView(item.id)}
                  className={
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ' +
                    (selected
                      ? 'bg-[#12bfc3] text-white shadow-lg shadow-[#12bfc3]/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white')
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] ' +
                        (selected
                          ? 'bg-white/20 text-white'
                          : item.id === 'attention'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300')
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-slate-100 p-4 dark:border-white/10">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#43ae37] text-sm font-bold text-white">
                  LB
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Leandro Bertanha</p>
                  <p className="text-xs text-slate-400">Administrador</p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-screen lg:pl-[276px]">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#071318]/90 sm:px-6 lg:px-8">
            <button
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 dark:border-white/10 dark:text-slate-200 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#12bfc3]">
                Operação
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {currentLabel}
              </h1>
            </div>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-[#12bfc3] dark:border-white/10 dark:bg-white/[0.05]"
                placeholder="Buscar na plataforma..."
              />
            </div>
            <button className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]">
              <BellRing className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f6ca4b] ring-2 ring-white dark:ring-[#071318]" />
            </button>
            <button
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            {active === 'dashboard' && <Dashboard />}
            {active === 'inbox' && (
              <InboxView selected={selectedConversation} onSelect={setSelectedConversation} />
            )}
            {active === 'attention' && <AttentionView />}
            {active === 'agents' && <AgentsView />}
            {active === 'knowledge' && <KnowledgeView />}
            {!['dashboard', 'inbox', 'attention', 'agents', 'knowledge'].includes(active) && (
              <ModuleView id={active} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Bom dia, Leandro</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Acompanhe a operação da Bit Consulting em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
            <CalendarDays className="h-4 w-4 text-[#12bfc3]" /> Últimos 30 dias{' '}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          <button className="rounded-xl bg-[#12bfc3] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#12bfc3]/20">
            Exportar relatório
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1c22]"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-[#12bfc3]/10 p-2.5 text-[#0a9da0]">
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={
                    'flex items-center gap-1 text-xs font-bold ' +
                    (metric.change.startsWith('-') && metric.label !== 'Transferidas'
                      ? 'text-rose-500'
                      : 'text-emerald-600')
                  }
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {metric.change}
                </span>
              </div>
              <p className="mt-5 text-3xl font-extrabold tracking-tight">{metric.value}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1c22] sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold">Volume de conversas</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Recebidas e resolvidas nos últimos 30 dias
              </p>
            </div>
            <StatusPill tone="success">+18,2% no período</StatusPill>
          </div>
          <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">
            {barHeights.map((height, index) => (
              <div key={index} className="group flex h-full flex-1 items-end">
                <div
                  className="relative w-full rounded-t-md bg-[#12bfc3]/25 transition hover:bg-[#12bfc3]/40"
                  style={{ height: height + '%' }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md bg-[#12bfc3]"
                    style={{ height: Math.max(30, height - 18) + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span>07 out.</span>
            <span>14 out.</span>
            <span>21 out.</span>
            <span>28 out.</span>
            <span>Hoje</span>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1c22] sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold">Qualidade da IA</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Avaliação das conversas
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[#43ae37]" />
          </div>
          <div className="mt-7 flex items-center gap-6">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{ background: 'conic-gradient(#43ae37 0 92%, #e2e8f0 92% 100%)' }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white dark:bg-[#0b1c22]">
                <strong className="text-3xl">9,2</strong>
                <span className="text-xs text-slate-400">de 10</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                ['Precisão', '96%'],
                ['Naturalidade', '93%'],
                ['Tom da marca', '89%'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-1.5 rounded-full bg-[#43ae37]" style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <span className="font-bold">3 conversas</span> precisam de revisão do supervisor.
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1c22]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
            <div>
              <h3 className="font-bold">Precisa de você</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Conversas aguardando ação humana
              </p>
            </div>
            <button className="text-sm font-bold text-[#0aa6aa]">Ver fila completa</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Espera</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {attentionRows.slice(0, 3).map((row) => (
                  <tr
                    key={row.client}
                    className="border-t border-slate-100 dark:border-white/[0.07]"
                  >
                    <td className="px-5 py-4 font-semibold">{row.client}</td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{row.reason}</td>
                    <td className="px-4 py-4 font-mono text-xs">{row.wait}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={row.priority === 'Alta' ? 'danger' : 'warning'}>
                        {row.priority}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-lg bg-[#12bfc3] px-3 py-2 text-xs font-bold text-white">
                        Assumir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1c22]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold">Resultado do mês</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Impacto atribuído à recepcionista
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-[#12bfc3]" />
          </div>
          <div className="mt-6 space-y-5">
            {[
              ['Leads qualificados', '186', '+24%'],
              ['Agendamentos', '94', '+18%'],
              ['Vendas registradas', '31', '+12%'],
              ['Receita atribuída', 'R$ 48.920', '+21%'],
            ].map(([label, value, change]) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-0.5 text-xl font-extrabold">{value}</p>
                </div>
                <StatusPill tone="success">{change}</StatusPill>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function InboxView({
  selected,
  onSelect,
}: {
  selected: number
  onSelect: (index: number) => void
}) {
  const current = conversations[selected]
  return (
    <div className="mx-auto grid h-[calc(100vh-144px)] max-w-[1600px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1c22] xl:grid-cols-[360px_1fr_320px]">
      <section className="flex min-h-0 flex-col border-r border-slate-100 dark:border-white/10">
        <div className="border-b border-slate-100 p-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Conversas</h2>
              <p className="text-xs text-slate-400">12 em andamento</p>
            </div>
            <button className="rounded-lg bg-[#12bfc3] p-2 text-white">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none dark:border-white/10 dark:bg-white/[0.04]"
              placeholder="Buscar conversa..."
            />
            <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.map((item, index) => (
            <button
              key={item.name}
              onClick={() => onSelect(index)}
              className={
                'flex w-full gap-3 border-b border-slate-100 p-4 text-left transition dark:border-white/[0.06] ' +
                (selected === index
                  ? 'bg-[#12bfc3]/[0.08]'
                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]')
              }
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#12bfc3]/15 text-sm font-bold text-[#0a9da0]">
                {item.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {item.text}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#0aa6aa]">{item.status}</span>
                  {item.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#12bfc3] px-1 text-[10px] font-bold text-white">
                      {item.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#43ae37]/15 font-bold text-[#43ae37]">
              {current.initials}
            </div>
            <div>
              <p className="font-bold">{current.name}</p>
              <p className="text-xs text-slate-400">WhatsApp • online agora</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-white/10">
              Pausar IA
            </button>
            <button className="rounded-lg bg-[#12bfc3] px-3 py-2 text-xs font-bold text-white">
              Assumir atendimento
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5 dark:bg-black/10">
          <div className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm dark:bg-white/10">
            Hoje, 10:32
          </div>
          <div className="max-w-[72%] rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm shadow-sm dark:bg-white/[0.07]">
            Olá! Gostaria de saber se vocês têm horário disponível para esta semana.
          </div>
          <div className="ml-auto max-w-[72%] rounded-2xl rounded-tr-sm bg-[#12bfc3] p-3.5 text-sm text-white shadow-sm">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <Sparkles className="h-3 w-3" /> Lia • IA
            </div>
            Olá, {current.name.split(' ')[0]}! Temos alguns horários disponíveis. Você prefere manhã
            ou tarde?
          </div>
          <div className="max-w-[72%] rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm shadow-sm dark:bg-white/[0.07]">
            Prefiro no período da tarde, de preferência na sexta.
          </div>
          <div className="ml-auto max-w-[72%] rounded-2xl rounded-tr-sm bg-[#12bfc3] p-3.5 text-sm text-white shadow-sm">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <Sparkles className="h-3 w-3" /> Lia • IA
            </div>
            Perfeito. Encontrei 14h e 16h30 na sexta-feira. Qual funciona melhor para você?
          </div>
        </div>
        <div className="border-t border-slate-100 p-4 dark:border-white/10">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <button className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-white/10">
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
              placeholder="Digite uma mensagem..."
            />
            <button className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-white/10">
              <Smile className="h-5 w-5" />
            </button>
            <button className="rounded-lg bg-[#12bfc3] p-2.5 text-white">
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            A IA está ativa e acompanha esta conversa
          </p>
        </div>
      </section>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-slate-100 p-5 dark:border-white/10 xl:block">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#12bfc3]/15 text-xl font-bold text-[#0a9da0]">
            {current.initials}
          </div>
          <h3 className="mt-3 font-bold">{current.name}</h3>
          <p className="text-xs text-slate-400">Cliente desde maio de 2026</p>
        </div>
        <div className="mt-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Resumo automático
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Cliente deseja agendar atendimento para sexta-feira à tarde. Preferência ainda não
              confirmada entre 14h e 16h30.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Intenção
            </p>
            <div className="mt-2 flex gap-2">
              <StatusPill tone="info">Agendamento</StatusPill>
              <StatusPill tone="success">Positivo</StatusPill>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Informações coletadas
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#43ae37]" /> Período: tarde
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#43ae37]" /> Dia: sexta-feira
              </li>
              <li className="flex gap-2">
                <Clock3 className="h-4 w-4 text-amber-500" /> Horário pendente
              </li>
            </ul>
          </div>
          <button className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold dark:border-white/10">
            Ver histórico completo
          </button>
        </div>
      </aside>
    </div>
  )
}

function AttentionView() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fila Precisa de Você</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Priorize as conversas que exigem intervenção humana.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusPill tone="danger">2 próximas do SLA</StatusPill>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
            <Filter className="mr-2 inline h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1c22]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-white/[0.03]">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-4 py-4">Recepcionista</th>
                <th className="px-4 py-4">Motivo</th>
                <th className="px-4 py-4">Espera</th>
                <th className="px-4 py-4">SLA restante</th>
                <th className="px-4 py-4">Prioridade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {attentionRows.map((row) => (
                <tr key={row.client} className="border-t border-slate-100 dark:border-white/[0.07]">
                  <td className="px-6 py-5 font-bold">{row.client}</td>
                  <td className="px-4 py-5">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12bfc3]/15 text-xs font-bold text-[#0a9da0]">
                        {row.agent[0]}
                      </span>
                      {row.agent}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400">{row.reason}</td>
                  <td className="px-4 py-5 font-mono">{row.wait}</td>
                  <td className="px-4 py-5">
                    <span
                      className={
                        row.sla === '3 min'
                          ? 'font-bold text-rose-600'
                          : 'font-semibold text-slate-600 dark:text-slate-300'
                      }
                    >
                      {row.sla}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <StatusPill
                      tone={
                        row.priority === 'Alta'
                          ? 'danger'
                          : row.priority === 'Média'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {row.priority}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="mr-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-white/10">
                      Delegar
                    </button>
                    <button className="rounded-lg bg-[#12bfc3] px-3 py-2 text-xs font-bold text-white">
                      Assumir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AgentsView() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Estúdio de recepcionistas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure personalidade, conhecimento, regras e autonomia.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-[#12bfc3] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#12bfc3]/20">
          <Plus className="h-4 w-4" />
          Nova recepcionista
        </button>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {receptionistCards.map((agent, index) => (
          <article
            key={agent.name}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1c22]"
          >
            <div className="flex items-start justify-between">
              <div
                className={
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold text-white ' +
                  (index === 0 ? 'bg-[#12bfc3]' : index === 1 ? 'bg-[#43ae37]' : 'bg-slate-400')
                }
              >
                {agent.name[0]}
              </div>
              <StatusPill tone={agent.status === 'Ativa' ? 'success' : 'neutral'}>
                {agent.status}
              </StatusPill>
            </div>
            <h3 className="mt-4 text-xl font-extrabold">{agent.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{agent.area}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center dark:border-white/10">
              <div>
                <p className="font-extrabold">{agent.conversations}</p>
                <p className="text-[10px] uppercase text-slate-400">Conversas</p>
              </div>
              <div>
                <p className="font-extrabold">{agent.quality}</p>
                <p className="text-[10px] uppercase text-slate-400">Qualidade</p>
              </div>
              <div>
                <p className="font-extrabold">{agent.version}</p>
                <p className="text-[10px] uppercase text-slate-400">Versão</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                Configurar
              </button>
              <button className="rounded-xl border border-slate-200 p-2.5 dark:border-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-[#12bfc3]/25 bg-gradient-to-r from-[#12bfc3]/10 via-white to-[#43ae37]/10 p-6 dark:via-[#0b1c22] lg:flex lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#12bfc3] p-3 text-white">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold">Simulador antes da publicação</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Teste preços, reclamações, urgências, pedidos de atendimento humano e tentativas de
              manipulação antes de colocar uma nova versão no ar.
            </p>
          </div>
        </div>
        <button className="mt-4 rounded-xl border border-[#12bfc3] px-4 py-2.5 text-sm font-bold text-[#0aa6aa] lg:mt-0">
          Abrir simulador
        </button>
      </section>
    </div>
  )
}

function KnowledgeView() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Base de conhecimento</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fontes verificadas usadas nas respostas da IA.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[#12bfc3] px-4 py-2.5 text-sm font-bold text-white">
          <UploadCloud className="h-4 w-4" />
          Adicionar fonte
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#0b1c22]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Fontes ativas</p>
          <p className="mt-1 text-3xl font-extrabold">18</p>
        </article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#0b1c22]">
          <p className="text-sm text-slate-500 dark:text-slate-400">Trechos indexados</p>
          <p className="mt-1 text-3xl font-extrabold">1.426</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/10">
          <p className="text-sm text-amber-700 dark:text-amber-300">Revisões pendentes</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-800 dark:text-amber-200">2</p>
        </article>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1c22]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/10 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              placeholder="Buscar fonte, categoria ou responsável..."
            />
          </div>
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10">
            <Filter className="mr-2 inline h-4 w-4" />
            Filtrar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:bg-white/[0.03]">
              <tr>
                <th className="px-6 py-4">Fonte</th>
                <th className="px-4 py-4">Categoria</th>
                <th className="px-4 py-4">Atualização</th>
                <th className="px-4 py-4">Conteúdo</th>
                <th className="px-4 py-4">Situação</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {knowledgeRows.map((row) => (
                <tr key={row.source} className="border-t border-slate-100 dark:border-white/[0.07]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[#12bfc3]/10 p-2 text-[#0a9da0]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="font-semibold">{row.source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400">{row.category}</td>
                  <td className="px-4 py-5 text-slate-500 dark:text-slate-400">{row.updated}</td>
                  <td className="px-4 py-5">{row.pages} itens</td>
                  <td className="px-4 py-5">
                    <StatusPill tone={row.status === 'Ativo' ? 'success' : 'warning'}>
                      {row.status}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ModuleView({ id }: { id: ViewId }) {
  const data: Record<
    string,
    { title: string; description: string; icon: LucideIcon; cards: string[] }
  > = {
    journeys: {
      title: 'Jornadas',
      description: 'Construa fluxos de atendimento, vendas, agendamento e pós-venda.',
      icon: Workflow,
      cards: ['Atendimento inicial', 'Agendamento', 'Pós-venda'],
    },
    quality: {
      title: 'Qualidade da IA',
      description: 'Avalie precisão, naturalidade, tom da marca e aderência às fontes.',
      icon: ShieldCheck,
      cards: ['Precisão factual', 'Aderência às fontes', 'Naturalidade'],
    },
    analytics: {
      title: 'Indicadores',
      description: 'Compare desempenho, conversão, produtividade e retorno financeiro.',
      icon: BarChart3,
      cards: ['Conversão', 'Tempo de resolução', 'Receita atribuída'],
    },
    integrations: {
      title: 'Integrações',
      description: 'Conecte WhatsApp oficial, agendas, CRM, ERP e webhooks.',
      icon: Plug,
      cards: ['WhatsApp Business', 'Google Agenda', 'Webhook personalizado'],
    },
    team: {
      title: 'Equipe',
      description: 'Organize usuários, funções, filas, horários e limites de atendimento.',
      icon: Users,
      cards: ['Gestores', 'Supervisores', 'Atendentes'],
    },
    settings: {
      title: 'Configurações',
      description: 'Controle segurança, LGPD, auditoria, planos e preferências.',
      icon: Settings,
      cards: ['Permissões e RBAC', 'Política de retenção', 'Logs de auditoria'],
    },
  }
  const module = data[id] || data.settings
  const Icon = module.icon
  return (
    <div className="mx-auto max-w-[1200px]">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1c22] sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#12bfc3]/12 text-[#0a9da0]">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight">{module.title}</h2>
        <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{module.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {module.cards.map((card, index) => (
            <article
              key={card}
              className="rounded-2xl border border-slate-200 p-5 dark:border-white/10"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#12bfc3]/10 text-sm font-extrabold text-[#0a9da0]">
                  {index + 1}
                </span>
                {index === 0 ? (
                  <StatusPill tone="success">Ativo</StatusPill>
                ) : (
                  <StatusPill>Configurar</StatusPill>
                )}
              </div>
              <h3 className="mt-5 font-bold">{card}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configuração preparada para evolução modular e segura.
              </p>
              <button className="mt-5 text-sm font-bold text-[#0aa6aa]">
                Abrir módulo <ArrowUpRight className="ml-1 inline h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#f6ca4b]/50 bg-[#f6ca4b]/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <strong>Estrutura do MVP:</strong> este módulo está pronto para receber dados reais do
            backend multitenant e regras de autorização por perfil.
          </p>
        </div>
      </section>
    </div>
  )
}

export default App
