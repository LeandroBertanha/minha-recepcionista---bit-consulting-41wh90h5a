import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  CalendarDays,
  Link2,
  Loader2,
  Plus,
  Save,
  ShieldBan,
  Trash2,
  Upload,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createAgentKnowledgeFile,
  createAgentKnowledgeLink,
  deleteAgentKnowledgeSource,
  getAgentKnowledgeSources,
  normalizeReceptionistConfiguration,
  updateAiAgent,
  type AgentKnowledgeSource,
  type AiAgent,
  type ReceptionistConfiguration,
} from '@/services/ai_agents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { parseRestrictedContacts } from '@/lib/restricted-contacts'
import { cn } from '@/lib/utils'

const marketPresets = [
  'Odontologia',
  'Estética',
  'Clínica médica',
  'Advocacia',
  'Imobiliária',
  'Provedor de internet',
  'E-commerce',
]
const activityPresets = [
  'Separar curiosos de compradores e agendar',
  'Tirar dúvidas e recuperar quem sumiu',
  'Vender direto no chat',
  'Pós-venda e retenção',
]
const tonePresets = ['Profissional e direto', 'Próximo e acolhedor', 'Consultivo']
const successPresets = [
  'Horário marcado na agenda',
  'Venda fechada no chat',
  'Cliente interessado encaminhado para a equipe',
]
const discoveryPresets = [
  'O que a pessoa quer resolver',
  'Se já é cliente ou é a primeira vez',
  'Urgência — para quando precisa',
  'Se tem orçamento para o serviço',
  'Quem decide a compra',
  'De onde veio (anúncio ou indicação)',
]
const neverDoPresets = [
  'Prometer resultado garantido',
  'Dar preço fechado sem informação suficiente',
  'Oferecer desconto por conta própria',
  'Dar diagnóstico ou orientação técnica',
  'Insistir depois de uma recusa clara',
]
const handoffPresets = [
  'Pediu para falar com uma pessoa',
  'Pediu desconto ou quer negociar',
  'Reclamou ou está irritado',
  'Quer fechar agora',
  'A recepcionista não sabe a resposta',
]

function FieldBlock({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400">
        {label}
      </Label>
      {children}
      {help ? (
        <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">{help}</p>
      ) : null}
    </div>
  )
}

function ChoiceChips({
  values,
  selected,
  onChange,
  single,
}: {
  values: string[]
  selected: string[]
  onChange: (values: string[]) => void
  single?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const active = selected.includes(value)
        return (
          <button
            key={value}
            type="button"
            onClick={() =>
              onChange(
                single
                  ? [value]
                  : active
                    ? selected.filter((item) => item !== value)
                    : [...selected, value],
              )
            }
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              active
                ? 'border-[#25D366] bg-[#EAFBF0] text-[#0A5C3B] dark:bg-[#25D366]/15 dark:text-[#7AF0A4]'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-300',
            )}
          >
            {value}
          </button>
        )
      })}
    </div>
  )
}

function AddListItem({
  placeholder,
  inputMode,
  onAdd,
}: {
  placeholder: string
  inputMode?: 'text' | 'tel'
  onAdd: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const submit = () => {
    const clean = value.trim()
    if (!clean) return
    onAdd(clean)
    setValue('')
  }
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
      <Button type="button" variant="outline" onClick={submit}>
        <Plus /> Adicionar
      </Button>
    </div>
  )
}

function RemovableChips({
  values,
  onRemove,
}: {
  values: string[]
  onRemove: (value: string) => void
}) {
  if (!values.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          title="Remover"
          onClick={() => onRemove(value)}
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-red-50 hover:text-red-700 dark:bg-white/10 dark:text-neutral-200"
        >
          {value} ×
        </button>
      ))}
    </div>
  )
}

export function AgentConfigurationStudio({
  agent,
  onSaved,
}: {
  agent: AiAgent
  onSaved: (agent: AiAgent) => void | Promise<void>
}) {
  const [configuration, setConfiguration] = useState(() =>
    normalizeReceptionistConfiguration(agent.configuration),
  )
  const [sources, setSources] = useState<AgentKnowledgeSource[]>([])
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingSources, setLoadingSources] = useState(true)
  const [sourceBusy, setSourceBusy] = useState(false)
  const [restrictedContactsInput, setRestrictedContactsInput] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setConfiguration(normalizeReceptionistConfiguration(agent.configuration))
  }, [agent.configuration, agent.id])

  useEffect(() => {
    let active = true
    setLoadingSources(true)
    getAgentKnowledgeSources(agent.id)
      .then((rows) => {
        if (active) setSources(rows)
      })
      .catch(() => toast.error('Não foi possível carregar as fontes de conhecimento.'))
      .finally(() => {
        if (active) setLoadingSources(false)
      })
    return () => {
      active = false
    }
  }, [agent.id])

  const update = (next: Partial<ReceptionistConfiguration>) =>
    setConfiguration((current) => ({ ...current, ...next }))

  const addRestrictedContacts = () => {
    const { valid, invalid } = parseRestrictedContacts(restrictedContactsInput)
    if (!valid.length) {
      toast.error('Informe ao menos um número válido com DDI e DDD.')
      return
    }

    const current = new Set(configuration.blocked_numbers)
    const added = valid.filter((number) => !current.has(number))
    update({ blocked_numbers: [...current, ...added] })
    setRestrictedContactsInput(invalid.join('\n'))

    if (invalid.length) {
      toast.warning(
        `${added.length} contato(s) adicionado(s). ${invalid.length} número(s) inválido(s) ficaram no campo para correção.`,
      )
    } else if (!added.length) {
      toast.info('Os contatos informados já estão na lista de restrição.')
    } else {
      toast.success(`${added.length} contato(s) adicionado(s) à restrição.`)
    }
  }

  const progress = useMemo(() => {
    const checks = [
      configuration.knowledge.company_info,
      configuration.behavior.company_name,
      configuration.behavior.market,
      configuration.behavior.activities.length,
      configuration.behavior.tone,
      configuration.behavior.success_definition,
      configuration.handoff.triggers.length,
      configuration.pricing.instructions,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [configuration])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAiAgent(agent.id, { configuration })
      await onSaved(updated)
      toast.success('Configuração da recepcionista salva.')
    } catch {
      toast.error('Não foi possível salvar a configuração.')
    } finally {
      setSaving(false)
    }
  }

  const addLink = async () => {
    const url = link.trim()
    try {
      new URL(url)
    } catch {
      toast.error('Informe um endereço válido, incluindo https://.')
      return
    }
    setSourceBusy(true)
    try {
      const source = await createAgentKnowledgeLink({
        agent_id: agent.id,
        user_id: agent.user_id,
        organization_id: agent.organization_id,
        url,
      })
      setSources((current) => [source, ...current])
      setLink('')
      toast.success('Link adicionado à base de conhecimento.')
    } catch {
      toast.error('Não foi possível adicionar o link.')
    } finally {
      setSourceBusy(false)
    }
  }

  const uploadFile = async (file?: File) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10 MB.')
      return
    }
    setSourceBusy(true)
    try {
      const readable = ['text/plain', 'text/csv', 'text/markdown'].includes(file.type)
      const content = readable ? (await file.text()).slice(0, 100000) : ''
      const source = await createAgentKnowledgeFile({
        agent_id: agent.id,
        user_id: agent.user_id,
        organization_id: agent.organization_id,
        file,
        content,
      })
      setSources((current) => [source, ...current])
      toast.success(
        readable
          ? 'Arquivo enviado e disponível para a recepcionista.'
          : 'Arquivo armazenado. A extração de PDF e Word será habilitada em uma próxima etapa.',
      )
    } catch {
      toast.error('Não foi possível enviar o arquivo.')
    } finally {
      setSourceBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removeSource = async (source: AgentKnowledgeSource) => {
    try {
      await deleteAgentKnowledgeSource(source.id)
      setSources((current) => current.filter((item) => item.id !== source.id))
      toast.success('Fonte removida.')
    } catch {
      toast.error('Não foi possível remover a fonte.')
    }
  }

  const behavior = configuration.behavior
  const handoff = configuration.handoff

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24">
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Configuração de {agent.name}</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Regras aplicadas no simulador e no WhatsApp desta recepcionista.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-emerald-600">{progress}% concluída</p>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="bg-[#25D366] text-[#0A0A0A] hover:bg-[#20bd5b]"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-white/10">
        <div>
          <p className="text-sm font-semibold">Responder em grupos</p>
          <p className="mt-1 text-xs text-neutral-500">
            Quando desligado, mensagens de grupos são ignoradas antes de consumir IA.
          </p>
        </div>
        <Switch
          checked={configuration.respond_in_groups}
          onCheckedChange={(respond_in_groups) => update({ respond_in_groups })}
          className="data-[state=checked]:bg-[#25D366]"
        />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-neutral-100 p-1.5 dark:bg-white/[0.05]">
          <TabsTrigger value="summary" className="rounded-full">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-full">
            O que sabe
          </TabsTrigger>
          <TabsTrigger value="behavior" className="rounded-full">
            Como atende
          </TabsTrigger>
          <TabsTrigger value="handoff" className="rounded-full">
            Quando chamar
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-full">
            Agenda
          </TabsTrigger>
          <TabsTrigger value="blocked" className="rounded-full">
            Contatos restritos ({configuration.blocked_numbers.length})
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-full">
            Quanto cobrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            [
              BookOpen,
              'Conhecimento',
              configuration.knowledge.company_info ? 'Informações cadastradas' : 'Pendente',
            ],
            [UserRoundCheck, 'Jeito de atender', behavior.tone || 'Pendente'],
            [CalendarDays, 'Agenda', configuration.scheduling.enabled ? 'Ativa' : 'Desativada'],
            [ShieldBan, 'Contatos restritos', `${configuration.blocked_numbers.length} número(s)`],
            [
              WalletCards,
              'Política comercial',
              configuration.pricing.instructions ? 'Configurada' : 'Pendente',
            ],
            [Link2, 'Fontes', `${sources.length} arquivo(s) ou link(s)`],
          ].map(([Icon, title, value]) => {
            const CardIcon = Icon as typeof BookOpen
            return (
              <div
                key={String(title)}
                className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
              >
                <CardIcon className="h-5 w-5 text-[#25D366]" />
                <p className="mt-3 text-sm font-semibold">{String(title)}</p>
                <p className="mt-1 text-xs text-neutral-500">{String(value)}</p>
              </div>
            )
          })}
        </TabsContent>

        <TabsContent
          value="knowledge"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div>
            <h3 className="font-semibold">O que {agent.name} sabe da empresa</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Preços, endereço, horários, formas de pagamento, serviços e limites.
            </p>
          </div>
          <FieldBlock label="Informações da empresa">
            <Textarea
              value={configuration.knowledge.company_info}
              maxLength={12000}
              onChange={(event) => update({ knowledge: { company_info: event.target.value } })}
              className="min-h-64"
              placeholder="Cole aqui as informações oficiais que a recepcionista pode usar."
            />
            <p className="text-right text-xs text-neutral-500">
              {configuration.knowledge.company_info.length.toLocaleString('pt-BR')} / 12.000
            </p>
          </FieldBlock>
          <div className="border-t border-neutral-200 pt-5 dark:border-white/10">
            <h4 className="text-sm font-semibold">Arquivos e links</h4>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              TXT, CSV e Markdown são lidos agora. PDF e Word ficam armazenados, mas ainda dependem
              da etapa de extração automática.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.csv,.txt,.md"
                onChange={(event) => void uploadFile(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={sourceBusy}
                onClick={() => fileInput.current?.click()}
              >
                <Upload /> Enviar arquivo
              </Button>
              <div className="flex flex-1 gap-2">
                <Input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="https://seusite.com.br/pagina"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={sourceBusy || !link.trim()}
                  onClick={() => void addLink()}
                >
                  Adicionar link
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {loadingSources ? (
                <p className="text-sm text-neutral-500">Carregando fontes...</p>
              ) : null}
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{source.name}</p>
                    <p className="text-xs text-neutral-500">
                      {source.type === 'link'
                        ? 'Link de referência'
                        : source.status === 'ready'
                          ? 'Conteúdo disponível'
                          : 'Arquivo armazenado'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${source.name}`}
                    onClick={() => void removeSource(source)}
                  >
                    <Trash2 className="text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="behavior"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div>
            <h3 className="font-semibold">Como {agent.name} atende</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Personalidade, objetivo e limites do atendimento.
            </p>
          </div>
          <FieldBlock label="Empresa">
            <Input
              value={behavior.company_name}
              onChange={(event) =>
                update({ behavior: { ...behavior, company_name: event.target.value } })
              }
            />
          </FieldBlock>
          <FieldBlock label="Mercado">
            <Input
              value={behavior.market}
              onChange={(event) =>
                update({ behavior: { ...behavior, market: event.target.value } })
              }
            />
            <ChoiceChips
              values={marketPresets}
              selected={[behavior.market]}
              single
              onChange={([market]) => update({ behavior: { ...behavior, market } })}
            />
          </FieldBlock>
          <FieldBlock label="O que ela faz">
            <ChoiceChips
              values={activityPresets}
              selected={behavior.activities}
              onChange={(activities) => update({ behavior: { ...behavior, activities } })}
            />
          </FieldBlock>
          <FieldBlock label="Tom de voz">
            <ChoiceChips
              values={tonePresets}
              selected={[behavior.tone]}
              single
              onChange={([tone]) => update({ behavior: { ...behavior, tone } })}
            />
          </FieldBlock>
          <FieldBlock label="O que é sucesso">
            <ChoiceChips
              values={successPresets}
              selected={[behavior.success_definition]}
              single
              onChange={([success_definition]) =>
                update({ behavior: { ...behavior, success_definition } })
              }
            />
          </FieldBlock>
          <FieldBlock label="O que precisa descobrir">
            <ChoiceChips
              values={discoveryPresets}
              selected={behavior.discovery_questions}
              onChange={(discovery_questions) =>
                update({ behavior: { ...behavior, discovery_questions } })
              }
            />
          </FieldBlock>
          <FieldBlock label="O que nunca faz">
            <ChoiceChips
              values={neverDoPresets}
              selected={behavior.never_do}
              onChange={(never_do) => update({ behavior: { ...behavior, never_do } })}
            />
          </FieldBlock>
          <FieldBlock
            label="Ajuste em uma frase"
            help="Complementa o comportamento sem apagar as escolhas acima."
          >
            <Input
              value={behavior.adjustment}
              onChange={(event) =>
                update({ behavior: { ...behavior, adjustment: event.target.value } })
              }
              placeholder='Ex.: "seja mais direto" ou "não ofereça desconto"'
            />
          </FieldBlock>
        </TabsContent>

        <TabsContent
          value="handoff"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div>
            <h3 className="font-semibold">Quando {agent.name} chama uma pessoa</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Situações reconhecidas pausam a automação e colocam a conversa em espera.
            </p>
          </div>
          <FieldBlock
            label="Número que recebe a intervenção"
            help="Com DDI e DDD. A pausa já funciona; o envio automático de aviso para este número ficará para a próxima etapa."
          >
            <Input
              inputMode="tel"
              value={handoff.intervention_number}
              onChange={(event) =>
                update({ handoff: { ...handoff, intervention_number: event.target.value } })
              }
              placeholder="5511999998888"
            />
          </FieldBlock>
          <FieldBlock label="Voltar a responder depois de">
            <ChoiceChips
              values={['1h', '3h', '6h', '12h', '24h', 'manual']}
              selected={[handoff.resume_after]}
              single
              onChange={([resume_after]) =>
                update({
                  handoff: {
                    ...handoff,
                    resume_after:
                      resume_after as ReceptionistConfiguration['handoff']['resume_after'],
                  },
                })
              }
            />
          </FieldBlock>
          <FieldBlock label="Chamar a equipe também quando">
            <ChoiceChips
              values={handoffPresets}
              selected={handoff.triggers}
              onChange={(triggers) => update({ handoff: { ...handoff, triggers } })}
            />
          </FieldBlock>
          <FieldBlock label="Palavras que chamam a equipe na hora">
            <AddListItem
              placeholder="Ex.: falar com atendente"
              onAdd={(value) =>
                update({
                  handoff: { ...handoff, keywords: [...new Set([...handoff.keywords, value])] },
                })
              }
            />
            <RemovableChips
              values={handoff.keywords}
              onRemove={(value) =>
                update({
                  handoff: {
                    ...handoff,
                    keywords: handoff.keywords.filter((item) => item !== value),
                  },
                })
              }
            />
          </FieldBlock>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 p-4 dark:bg-white/[0.04]">
            <div>
              <p className="text-sm font-semibold">A equipe tem horário</p>
              <p className="mt-1 text-xs text-neutral-500">A IA explica quando a equipe volta.</p>
            </div>
            <Switch
              checked={handoff.business_hours_enabled}
              onCheckedChange={(business_hours_enabled) =>
                update({ handoff: { ...handoff, business_hours_enabled } })
              }
            />
          </div>
          {handoff.business_hours_enabled ? (
            <Textarea
              value={handoff.business_hours}
              onChange={(event) =>
                update({ handoff: { ...handoff, business_hours: event.target.value } })
              }
              placeholder="Ex.: Segunda a sexta, das 8h às 18h."
            />
          ) : null}
        </TabsContent>

        <TabsContent
          value="schedule"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Agenda</h3>
              <p className="mt-1 text-sm text-neutral-500">Como oferecer e confirmar horários.</p>
            </div>
            <Switch
              checked={configuration.scheduling.enabled}
              onCheckedChange={(enabled) =>
                update({ scheduling: { ...configuration.scheduling, enabled } })
              }
            />
          </div>
          <FieldBlock
            label="Regras de agendamento"
            help="Não prometa horários que não estejam explicitamente disponíveis."
          >
            <Textarea
              disabled={!configuration.scheduling.enabled}
              value={configuration.scheduling.instructions}
              onChange={(event) =>
                update({
                  scheduling: { ...configuration.scheduling, instructions: event.target.value },
                })
              }
              className="min-h-44"
              placeholder="Ex.: confirme nome, telefone, unidade e melhor período."
            />
          </FieldBlock>
        </TabsContent>

        <TabsContent
          value="blocked"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div>
            <h3 className="font-semibold">Contatos restritos de {agent.name}</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Estes contatos continuam aparecendo nas conversas, mas não recebem respostas
              automáticas desta recepcionista.
            </p>
          </div>
          <FieldBlock
            label="Números de WhatsApp"
            help="Adicione um ou vários números, separados por linha, vírgula ou ponto e vírgula. Use DDI e DDD; números brasileiros sem DDI recebem 55 automaticamente."
          >
            <Textarea
              value={restrictedContactsInput}
              onChange={(event) => setRestrictedContactsInput(event.target.value)}
              className="min-h-28"
              placeholder={'5511999998888\n5521988887777'}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                {configuration.blocked_numbers.length.toLocaleString('pt-BR')} contato(s)
                restrito(s). A tela não define limite de quantidade.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!restrictedContactsInput.trim()}
                onClick={addRestrictedContacts}
              >
                <Plus /> Adicionar contatos
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200 p-3 dark:border-white/10">
              {configuration.blocked_numbers.length ? (
                <RemovableChips
                  values={configuration.blocked_numbers}
                  onRemove={(value) =>
                    update({
                      blocked_numbers: configuration.blocked_numbers.filter(
                        (item) => item !== value,
                      ),
                    })
                  }
                />
              ) : (
                <p className="text-sm text-neutral-500">Nenhum contato restrito.</p>
              )}
            </div>
          </FieldBlock>
        </TabsContent>

        <TabsContent
          value="pricing"
          className="mt-5 space-y-6 rounded-2xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div>
            <h3 className="font-semibold">Quanto cobrar</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Valores, pagamento, descontos permitidos e limites.
            </p>
          </div>
          <FieldBlock
            label="Política comercial"
            help="Quando faltar informação, a recepcionista deve dizer que vai confirmar, sem inventar preço."
          >
            <Textarea
              value={configuration.pricing.instructions}
              onChange={(event) => update({ pricing: { instructions: event.target.value } })}
              className="min-h-64"
              placeholder="Ex.: avaliação inicial R$ 100; descontos somente com aprovação humana."
            />
          </FieldBlock>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="bg-[#25D366] px-6 text-[#0A0A0A] shadow-xl hover:bg-[#20bd5b]"
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </Button>
      </div>
    </div>
  )
}
