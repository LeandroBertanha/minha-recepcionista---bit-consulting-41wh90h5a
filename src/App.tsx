import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/use-auth'
import pb from './lib/pocketbase/client'
import ConnectionSetup from './pages/ConnectionSetup'
import Inbox from './pages/Inbox'
import { Toaster } from './components/ui/toaster'
import { ProductLogo } from './components/ProductLogo'
import { HeroReveal } from './landing/components/HeroReveal'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plug,
  Plus,
  Search,
  Settings,
  ShieldCheck,
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
  { id: 'inbox', label: 'Conversas', icon: MessageCircle },
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
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
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

function DashboardApp() {
  const { user, signOut } = useAuth()
  const displayName = user?.name || user?.email || 'Usuário'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'US'
  const [active, setActive] = useState<ViewId>('dashboard')
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tenant, setTenant] = useState<{ id: string; name: string; role: string } | null>(null)
  const [tenantLoading, setTenantLoading] = useState(true)
  const [tenantError, setTenantError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadTenant = async () => {
      if (!user?.id) return
      setTenantLoading(true)
      setTenantError('')

      try {
        const membership = await pb
          .collection('organization_members')
          .getFirstListItem('user_id = "' + user.id + '" && status = "active"', {
            expand: 'organization_id',
          })
        const organization = membership.expand?.organization_id
        if (!organization) throw new Error('Organização não encontrada')

        if (mounted) {
          setTenant({
            id: organization.id,
            name: organization.name,
            role: membership.role,
          })
        }
      } catch (_error) {
        if (mounted) {
          setTenant(null)
          setTenantError('Seu usuário ainda não possui acesso ativo a uma empresa.')
        }
      } finally {
        if (mounted) setTenantLoading(false)
      }
    }

    loadTenant()
    return () => {
      mounted = false
    }
  }, [user?.id])

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

  const roleLabel =
    {
      owner: 'Proprietário',
      admin: 'Administrador',
      supervisor: 'Supervisor',
      agent: 'Atendente',
      viewer: 'Somente leitura',
    }[tenant?.role || ''] || 'Membro'

  if (tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-neutral-700 dark:bg-[#0A0A0A] dark:text-neutral-200">
        <div className="text-center">
          <ProductLogo tone="light" className="justify-center dark:[&>span]:text-white" />
          <p className="mt-4 text-sm font-semibold">Carregando sua empresa...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 text-neutral-900 dark:bg-[#0A0A0A] dark:text-neutral-100">
        <section className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-[#141414]">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#25D366]" />
          <h1 className="mt-4 text-2xl font-semibold">Acesso aguardando liberação</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            {tenantError}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#0A0A0A]"
          >
            Sair da conta
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F5F5F5] text-neutral-900 transition-colors dark:bg-[#0A0A0A] dark:text-neutral-100">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-neutral-950/45 lg:hidden"
            aria-label="Fechar menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={
            'fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col bg-[#0A0A0A] text-white transition-transform lg:translate-x-0 ' +
            (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
          }
        >
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <ProductLogo tone="dark" />
            <button
              className="rounded-full p-2 text-white/60 hover:bg-white/10 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="font-machine text-[10px] font-medium uppercase tracking-wider text-white/40">
              Empresa ativa
            </p>
            <button className="mt-1 flex w-full items-center justify-between text-left text-sm font-semibold">
              {tenant.name} <ChevronDown className="h-4 w-4 text-white/40" />
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
                    'flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition ' +
                    (selected
                      ? 'bg-[#25D366] text-[#0A0A0A]'
                      : 'text-white/65 hover:bg-white/[0.07] hover:text-white')
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] ' +
                        (selected
                          ? 'bg-[#0A0A0A] text-[#25D366]'
                          : item.id === 'attention'
                            ? 'bg-[#25D366] text-[#0A0A0A]'
                            : 'bg-white/10 text-white/70')
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-sm font-bold text-[#0A0A0A]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-white/45">{roleLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                  aria-label="Sair da conta"
                  title="Sair da conta"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-screen lg:pl-[276px]">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-neutral-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0A0A0A]/90 sm:px-6 lg:px-8">
            <button
              className="rounded-full border border-neutral-200 p-2.5 text-neutral-600 dark:border-white/10 dark:text-neutral-200 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-machine text-[11px] font-medium uppercase tracking-[0.16em] text-[#128C7E] dark:text-[#25D366]">
                Operação
              </p>
              <h1 className="truncate text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                {currentLabel}
              </h1>
            </div>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                className="h-10 w-64 rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-[#25D366] dark:border-white/10 dark:bg-white/[0.05]"
                placeholder="Buscar na plataforma..."
              />
            </div>
            <button className="relative rounded-full border border-neutral-200 p-2.5 text-neutral-500 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.06]">
              <BellRing className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#25D366] ring-2 ring-white dark:ring-[#0A0A0A]" />
            </button>
            <button
              className="rounded-full border border-neutral-200 p-2.5 text-neutral-500 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.06]"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            {active === 'dashboard' && <Dashboard companyName={tenant.name} />}
            {active === 'inbox' && (
              <Inbox
                organizationId={tenant.id}
                onConnectionSetup={() => selectView('integrations')}
              />
            )}
            {active === 'attention' && <AttentionView />}
            {active === 'agents' && <AgentsView />}
            {active === 'knowledge' && <KnowledgeView />}
            {active === 'integrations' ? (
              <ConnectionSetup organizationId={tenant.id} />
            ) : (
              !['dashboard', 'inbox', 'attention', 'agents', 'knowledge'].includes(active) && (
                <ModuleView id={active} />
              )
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Dashboard({ companyName }: { companyName: string }) {
  const { user } = useAuth()
  const firstName = (user?.name || user?.email || 'usuário').split(' ')[0]

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Bom dia, {firstName}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Acompanhe a operação da {companyName} em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
            <CalendarDays className="h-4 w-4 text-[#128C7E]" /> Últimos 30 dias{' '}
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </button>
          <button className="rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#0A0A0A]">
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
              className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414]"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-[#EAFBF0] p-2.5 text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
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
              <p className="mt-5 text-3xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{metric.label}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <article className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414] sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold tracking-[-0.01em]">Volume de conversas</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Recebidas e resolvidas nos últimos 30 dias
              </p>
            </div>
            <StatusPill tone="success">+18,2% no período</StatusPill>
          </div>
          <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">
            {barHeights.map((height, index) => (
              <div key={index} className="group flex h-full flex-1 items-end">
                <div
                  className="relative w-full rounded-t-lg bg-[#0A0A0A]/[0.07] transition hover:bg-[#0A0A0A]/[0.12] dark:bg-white/10"
                  style={{ height: height + '%' }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-lg bg-[#25D366]"
                    style={{ height: Math.max(30, height - 18) + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="font-machine mt-3 flex justify-between text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            <span>07 out.</span>
            <span>14 out.</span>
            <span>21 out.</span>
            <span>28 out.</span>
            <span>Hoje</span>
          </div>
        </article>

        <article className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414] sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold tracking-[-0.01em]">Qualidade da IA</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Avaliação das conversas
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[#128C7E]" />
          </div>
          <div className="mt-7 flex items-center gap-6">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{ background: 'conic-gradient(#25D366 0 92%, #E5E5E5 92% 100%)' }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white dark:bg-[#141414]">
                <strong className="text-3xl">9,2</strong>
                <span className="text-xs text-neutral-400">de 10</span>
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
                    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-white/10">
                    <div className="h-1.5 rounded-full bg-[#25D366]" style={{ width: value }} />
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
        <article className="overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-white/10">
            <div>
              <h3 className="font-semibold tracking-[-0.01em]">Precisa de você</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Conversas aguardando ação humana
              </p>
            </div>
            <button className="text-sm font-bold text-[#128C7E]">Ver fila completa</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="font-machine bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-400 dark:bg-white/[0.03]">
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
                    className="border-t border-neutral-100 dark:border-white/[0.07]"
                  >
                    <td className="px-5 py-4 font-semibold">{row.client}</td>
                    <td className="px-4 py-4 text-neutral-500 dark:text-neutral-400">
                      {row.reason}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{row.wait}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={row.priority === 'Alta' ? 'danger' : 'warning'}>
                        {row.priority}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-full bg-[#25D366] px-3 py-2 text-xs font-bold text-[#0A0A0A]">
                        Assumir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold tracking-[-0.01em]">Resultado do mês</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Impacto atribuído à recepcionista
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-[#128C7E]" />
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
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
                  <p className="mt-0.5 text-xl font-semibold">{value}</p>
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

function AttentionView() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Fila Precisa de Você</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Priorize as conversas que exigem intervenção humana.
          </p>
        </div>
        <div className="flex gap-2">
          <StatusPill tone="danger">2 próximas do SLA</StatusPill>
          <button className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.04]">
            <Filter className="mr-2 inline h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#141414]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="font-machine bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-400 dark:bg-white/[0.03]">
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
                <tr
                  key={row.client}
                  className="border-t border-neutral-100 dark:border-white/[0.07]"
                >
                  <td className="px-6 py-5 font-bold">{row.client}</td>
                  <td className="px-4 py-5">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAFBF0] text-xs font-bold text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
                        {row.agent[0]}
                      </span>
                      {row.agent}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-neutral-500 dark:text-neutral-400">{row.reason}</td>
                  <td className="px-4 py-5 font-mono">{row.wait}</td>
                  <td className="px-4 py-5">
                    <span
                      className={
                        row.sla === '3 min'
                          ? 'font-bold text-rose-600'
                          : 'font-semibold text-neutral-600 dark:text-neutral-300'
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
                    <button className="mr-2 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold dark:border-white/10">
                      Delegar
                    </button>
                    <button className="rounded-full bg-[#25D366] px-3 py-2 text-xs font-bold text-[#0A0A0A]">
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
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Estúdio de recepcionistas</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Configure personalidade, conhecimento, regras e autonomia.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#0A0A0A]">
          <Plus className="h-4 w-4" />
          Nova recepcionista
        </button>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {receptionistCards.map((agent, index) => (
          <article
            key={agent.name}
            className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414]"
          >
            <div className="flex items-start justify-between">
              <div
                className={
                  'flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ' +
                  (index === 0
                    ? 'bg-[#25D366] text-[#0A0A0A]'
                    : index === 1
                      ? 'bg-[#0A0A0A] text-[#25D366] dark:bg-white dark:text-[#0A0A0A]'
                      : 'bg-neutral-200 text-neutral-500')
                }
              >
                {agent.name[0]}
              </div>
              <StatusPill tone={agent.status === 'Ativa' ? 'success' : 'neutral'}>
                {agent.status}
              </StatusPill>
            </div>
            <h3 className="mt-4 text-xl font-semibold">{agent.name}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{agent.area}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-neutral-100 py-4 text-center dark:border-white/10">
              <div>
                <p className="font-semibold">{agent.conversations}</p>
                <p className="text-[10px] uppercase text-neutral-400">Conversas</p>
              </div>
              <div>
                <p className="font-semibold">{agent.quality}</p>
                <p className="text-[10px] uppercase text-neutral-400">Qualidade</p>
              </div>
              <div>
                <p className="font-semibold">{agent.version}</p>
                <p className="text-[10px] uppercase text-neutral-400">Versão</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-full bg-[#0A0A0A] py-2.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
                Configurar
              </button>
              <button className="rounded-full border border-neutral-200 p-2.5 dark:border-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="rounded-[28px] bg-[#0A0A0A] p-6 text-white sm:p-8 lg:flex lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-[#25D366] p-3 text-[#0A0A0A]">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold tracking-[-0.01em]">Simulador antes da publicação</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Teste preços, reclamações, urgências, pedidos de atendimento humano e tentativas de
              manipulação antes de colocar uma nova versão no ar.
            </p>
          </div>
        </div>
        <button className="mt-4 shrink-0 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#1EBE5A] lg:mt-0">
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
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Base de conhecimento</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Fontes verificadas usadas nas respostas da IA.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#0A0A0A]">
          <UploadCloud className="h-4 w-4" />
          Adicionar fonte
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-[24px] border border-neutral-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Fontes ativas</p>
          <p className="mt-1 text-3xl font-semibold">18</p>
        </article>
        <article className="rounded-[24px] border border-neutral-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Trechos indexados</p>
          <p className="mt-1 text-3xl font-semibold">1.426</p>
        </article>
        <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/10">
          <p className="text-sm text-amber-700 dark:text-amber-300">Revisões pendentes</p>
          <p className="mt-1 text-3xl font-semibold text-amber-800 dark:text-amber-200">2</p>
        </article>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#141414]">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 dark:border-white/10 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/[0.04]"
              placeholder="Buscar fonte, categoria ou responsável..."
            />
          </div>
          <button className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-white/10">
            <Filter className="mr-2 inline h-4 w-4" />
            Filtrar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="font-machine bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-400 dark:bg-white/[0.03]">
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
                <tr
                  key={row.source}
                  className="border-t border-neutral-100 dark:border-white/[0.07]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[#EAFBF0] p-2 text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="font-semibold">{row.source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-neutral-500 dark:text-neutral-400">
                    {row.category}
                  </td>
                  <td className="px-4 py-5 text-neutral-500 dark:text-neutral-400">
                    {row.updated}
                  </td>
                  <td className="px-4 py-5">{row.pages} itens</td>
                  <td className="px-4 py-5">
                    <StatusPill tone={row.status === 'Ativo' ? 'success' : 'warning'}>
                      {row.status}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-white/10">
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
      <section className="rounded-[28px] border border-neutral-200/80 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#141414] sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAFBF0] text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight">{module.title}</h2>
        <p className="mt-2 max-w-2xl text-neutral-500 dark:text-neutral-400">
          {module.description}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {module.cards.map((card, index) => (
            <article
              key={card}
              className="rounded-[24px] border border-neutral-200 p-5 dark:border-white/10"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAFBF0] text-sm font-semibold text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
                  {index + 1}
                </span>
                {index === 0 ? (
                  <StatusPill tone="success">Ativo</StatusPill>
                ) : (
                  <StatusPill>Configurar</StatusPill>
                )}
              </div>
              <h3 className="mt-5 font-bold">{card}</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Configuração preparada para evolução modular e segura.
              </p>
              <button className="mt-5 text-sm font-bold text-[#128C7E]">
                Abrir módulo <ArrowUpRight className="ml-1 inline h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-400/20 dark:bg-amber-400/10">
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

function AuthenticatedApp() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loginDark, setLoginDark] = useState(
    () => window.localStorage.getItem('minha-recepcionista-theme') === 'dark',
  )

  useEffect(() => {
    window.localStorage.setItem('minha-recepcionista-theme', loginDark ? 'dark' : 'light')
  }, [loginDark])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Informe seu e-mail e sua senha.')
      return
    }

    setSubmitting(true)
    setError('')
    const result = await signIn(email.trim(), password)
    if (result.error) {
      setError('Não foi possível entrar. Confira o e-mail e a senha.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-neutral-700 dark:bg-[#0A0A0A] dark:text-neutral-200">
        <div className="text-center">
          <ProductLogo tone="light" className="justify-center dark:[&>span]:text-white" />
          <p className="mt-4 text-sm font-semibold">Carregando ambiente seguro...</p>
        </div>
      </div>
    )
  }

  if (user) return <DashboardApp key={user.id} />

  const inputClass =
    'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-[#0A0A0A] focus:ring-4 focus:ring-[#25D366]/25 dark:border-white/10 dark:bg-white/[0.05] dark:focus:border-[#25D366]'
  return (
    <div className={loginDark ? 'dark' : ''}>
      <main className="grid min-h-screen bg-white text-[#0A0A0A] transition-colors dark:bg-[#0A0A0A] dark:text-white lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-[#0A0A0A] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -right-32 top-24 h-[520px] w-[520px] rounded-full bg-[#25D366]/[0.14] blur-[110px]" />
          <a href="/" className="relative w-fit">
            <ProductLogo tone="dark" />
          </a>
          <div className="relative">
            <h2 className="max-w-lg font-landing text-[clamp(2.4rem,4vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
              Seu WhatsApp trabalhando por você.
              <span className="mt-2 block font-human text-[1.08em] font-normal italic tracking-[-0.02em] text-[#25D366]">
                24 horas por dia.
              </span>
            </h2>
            <div className="mt-10 flex max-w-xl items-end gap-5">
              <HeroReveal
                lensRadius={90}
                hint="Passe o mouse"
                className="w-[240px] shrink-0 rounded-[28px] xl:w-[270px]"
              />
              <div className="space-y-2 pb-6">
                <p className="w-fit max-w-[15rem] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug text-[#0A0A0A]">
                  Oi! Vocês têm horário amanhã?
                </p>
                <p className="ml-6 w-fit max-w-[15rem] rounded-2xl rounded-br-md bg-[#D9FDD3] px-3.5 py-2.5 text-[13px] leading-snug text-[#0A0A0A]">
                  Temos sim, às 9h ou 14h. Qual fica melhor?
                </p>
              </div>
            </div>
          </div>
          <p className="relative font-machine text-[10px] uppercase tracking-[0.16em] text-white/40">
            Um produto Bit Consulting e AI.R Innovation
          </p>
        </aside>

        <section className="relative flex items-center justify-center px-5 py-12 sm:px-10">
          <button
            type="button"
            onClick={() => setLoginDark((value) => !value)}
            className="absolute right-5 top-5 rounded-full border border-neutral-200 p-3 text-neutral-600 transition hover:border-[#0A0A0A] dark:border-white/10 dark:text-neutral-200 dark:hover:border-[#25D366]"
            aria-label={loginDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {loginDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="w-full max-w-[400px]">
            <a href="/" className="mb-10 block w-fit lg:hidden">
              <ProductLogo tone={loginDark ? 'dark' : 'light'} />
            </a>
            <p className="font-machine text-[11px] uppercase tracking-[0.18em] text-[#128C7E] dark:text-[#25D366]">
              Área do cliente
            </p>
            <h1 className="mt-3 font-landing text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em]">
              Acesse sua{' '}
              <span className="font-human text-[1.12em] font-normal italic tracking-[-0.01em] text-[#128C7E] dark:text-[#25D366]">
                operação.
              </span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Entre para acompanhar conversas, recepcionistas e resultados.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-semibold">
                    Senha
                  </label>
                  <span className="font-machine text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    Acesso administrativo
                  </span>
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className={inputClass}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-4 text-[15px] font-semibold text-[#0A0A0A] transition hover:bg-[#1EBE5A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Entrando...' : 'Entrar no sistema'}
                {!submitting && (
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#F5F5F5] p-4 text-[13px] leading-5 text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E] dark:text-[#25D366]" />
              <p>
                O acesso é restrito a usuários cadastrados. Novos membros serão convidados por um
                administrador.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
      <Toaster />
    </AuthProvider>
  )
}

export default App
