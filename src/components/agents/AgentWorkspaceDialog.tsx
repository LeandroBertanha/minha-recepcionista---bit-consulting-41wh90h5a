import { useEffect, useState } from 'react'
import { Bot, LogOut, MessageCircle, Pencil, Plug, QrCode, Settings2, Sparkles } from 'lucide-react'
import Inbox from '@/pages/Inbox'
import { simulateAiAgent, type AiAgent } from '@/services/ai_agents'
import { AgentConfigurationStudio } from '@/components/agents/AgentConfigurationStudio'
import {
  fetchInstanceQR,
  getInstances,
  logoutInstance,
  type WhatsAppInstance,
} from '@/services/whatsapp'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type AgentWorkspaceDialogProps = {
  agent: AiAgent | null
  instance?: WhatsAppInstance
  organizationId: string
  onOpenChange: (open: boolean) => void
  onEdit: (agent: AiAgent) => void
  onRefresh: () => void | Promise<void>
}

export function AgentWorkspaceDialog({
  agent,
  instance,
  organizationId,
  onOpenChange,
  onEdit,
  onRefresh,
}: AgentWorkspaceDialogProps) {
  const [tab, setTab] = useState('conversations')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [simulationError, setSimulationError] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [currentStatus, setCurrentStatus] = useState(instance?.status || 'pending')

  useEffect(() => {
    setCurrentStatus(instance?.status || 'pending')
  }, [instance?.status])

  useEffect(() => {
    if (!agent) {
      setTab('conversations')
      setMessage('')
      setReply('')
      setSimulationError('')
      setQrCode('')
      setConnectionError('')
    }
  }, [agent])

  useEffect(() => {
    if (!agent || currentStatus !== 'connecting') return
    const timer = window.setInterval(async () => {
      try {
        const rows = await getInstances(organizationId)
        const current = rows.find((row) => row.id === agent.instance_id)
        if (!current) return
        setCurrentStatus(current.status)
        if (current.status === 'connected') {
          setQrCode('')
          await onRefresh()
        } else if (current.status === 'connecting' && !qrCode) {
          const result = await fetchInstanceQR(agent.instance_id)
          setCurrentStatus(result.status)
          setQrCode(result.qrcode || '')
        }
      } catch (_) {
        // A próxima atualização em tempo real ou o próximo ciclo refaz a consulta.
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [agent, currentStatus, onRefresh, organizationId, qrCode])

  if (!agent) return null

  const runSimulation = async () => {
    const customerMessage = message.trim()
    if (!customerMessage) return
    setSimulating(true)
    setReply('')
    setSimulationError('')
    try {
      const result = await simulateAiAgent(agent.id, customerMessage)
      setReply(result.reply)
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { message?: string } }).response?.message
          : undefined
      setSimulationError(responseMessage || 'Não foi possível concluir o teste da IA.')
    } finally {
      setSimulating(false)
    }
  }

  const connectWhatsApp = async () => {
    setConnecting(true)
    setConnectionError('')
    setQrCode('')
    try {
      const result = await fetchInstanceQR(agent.instance_id)
      setCurrentStatus(result.status)
      setQrCode(result.qrcode || '')
      await onRefresh()
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { message?: string } }).response?.message
          : undefined
      setConnectionError(responseMessage || 'Não foi possível conectar o WhatsApp.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWhatsApp = async () => {
    setDisconnecting(true)
    setConnectionError('')
    try {
      await logoutInstance(agent.instance_id)
      setCurrentStatus('disconnected')
      setQrCode('')
      await onRefresh()
    } catch (error) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { message?: string } }).response?.message
          : undefined
      setConnectionError(responseMessage || 'Não foi possível desconectar o WhatsApp.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Dialog open={!!agent} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden border-neutral-200 bg-white p-0 text-neutral-900 dark:border-white/10 dark:bg-[#141414] dark:text-white sm:max-w-[1500px]">
        <DialogHeader className="border-b border-neutral-200 px-6 pb-4 pt-6 pr-14 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-[#25D366]" />
                {agent.name}
              </DialogTitle>
              <DialogDescription>
                WhatsApp, conversas, simulação e configuração desta recepcionista.
              </DialogDescription>
            </div>
            <Button type="button" variant="outline" className="w-fit" onClick={() => onEdit(agent)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar configuração
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-neutral-200 px-6 py-3 dark:border-white/10">
            <TabsList className="grid w-full max-w-3xl grid-cols-4">
              <TabsTrigger value="conversations">
                <MessageCircle className="mr-2 h-4 w-4" /> Conversas
              </TabsTrigger>
              <TabsTrigger value="simulator">
                <Sparkles className="mr-2 h-4 w-4" /> Simulador
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <Plug className="mr-2 h-4 w-4" /> WhatsApp
              </TabsTrigger>
              <TabsTrigger value="configuration">
                <Settings2 className="mr-2 h-4 w-4" /> Configuração
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="conversations" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <Inbox
              organizationId={organizationId}
              instanceIdOverride={agent.instance_id}
              embedded
              onConnectionSetup={() => setTab('whatsapp')}
            />
          </TabsContent>

          <TabsContent value="simulator" className="mt-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Simular atendimento de {agent.name}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  O teste usa as instruções desta recepcionista sem enviar mensagens ao WhatsApp.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor={`simulation-${agent.id}`} className="text-sm font-medium">
                  Mensagem do cliente
                </label>
                <Textarea
                  id={`simulation-${agent.id}`}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value)
                    setSimulationError('')
                  }}
                  maxLength={4000}
                  placeholder="Ex.: Gostaria de saber o preço e como funciona o serviço."
                  className="min-h-36"
                />
                <p className="text-right text-xs text-neutral-500">
                  {message.length.toLocaleString('pt-BR')} / 4.000 caracteres
                </p>
              </div>
              <Button
                type="button"
                disabled={simulating || !message.trim()}
                onClick={() => void runSimulation()}
                className="bg-[#25D366] font-bold text-[#0A0A0A] hover:bg-[#20bd5b]"
              >
                {simulating ? 'Testando...' : 'Testar recepcionista'}
              </Button>
              {reply ? (
                <div
                  aria-live="polite"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                    Resposta da recepcionista
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply}</p>
                </div>
              ) : null}
              {simulationError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
                >
                  {simulationError}
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl space-y-5">
              <div>
                <h3 className="text-lg font-semibold">WhatsApp de {agent.name}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Esta conexão é exclusiva e filtra somente as conversas desta recepcionista.
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {instance?.instance_name || 'Instância vinculada'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Status:{' '}
                      {currentStatus === 'connected'
                        ? 'conectado'
                        : currentStatus === 'connecting'
                          ? 'aguardando leitura do QR Code'
                          : 'desconectado'}
                    </p>
                  </div>
                  <span
                    className={`h-3 w-3 rounded-full ${
                      currentStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>
              </div>
              {currentStatus === 'connected' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disconnecting}
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-400/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar o WhatsApp de {agent.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta recepcionista deixará de receber mensagens. Para conectar novamente,
                        será necessário escanear um novo QR Code no celular.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void disconnectWhatsApp()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  type="button"
                  disabled={connecting}
                  onClick={() => void connectWhatsApp()}
                  className="bg-[#25D366] font-bold text-[#0A0A0A] hover:bg-[#20bd5b]"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  {connecting
                    ? 'Gerando QR Code...'
                    : currentStatus === 'disconnected'
                      ? 'Conectar novamente'
                      : 'Gerar QR Code'}
                </Button>
              )}
              {qrCode ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center dark:border-white/10">
                  <img
                    src={qrCode}
                    alt="QR Code do WhatsApp desta recepcionista"
                    className="mx-auto h-64 w-64 object-contain"
                  />
                  <p className="mt-3 text-sm text-neutral-600">
                    No celular: WhatsApp → Aparelhos conectados → Conectar aparelho.
                  </p>
                </div>
              ) : null}
              {connectionError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {connectionError}
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="mt-0 flex-1 overflow-y-auto p-6">
            <AgentConfigurationStudio
              agent={agent}
              onSaved={async () => {
                await onRefresh()
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
