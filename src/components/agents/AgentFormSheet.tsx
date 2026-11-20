import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { createAiAgent, updateAiAgent, type AiAgent } from '@/services/ai_agents'
import {
  fetchInstanceQR,
  getInstances,
  prepareDedicatedInstance,
  type WhatsAppInstance,
} from '@/services/whatsapp'
import {
  getReceptionistPromptTemplate,
  receptionistPromptTemplates,
} from '@/data/receptionist-prompt-templates'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, QrCode, Smartphone } from 'lucide-react'

const SYSTEM_PROMPT_MAX_LENGTH = 7_000

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  instance_id: z.string().min(1, 'Conecte ou selecione um WhatsApp para esta recepcionista'),
  provider: z.enum(['gemini', 'openai', 'grok'], { error: 'Provedor é obrigatório' }),
  system_prompt: z
    .string()
    .min(1, 'Prompt do sistema é obrigatório')
    .max(
      SYSTEM_PROMPT_MAX_LENGTH,
      `O prompt do sistema deve ter no máximo ${SYSTEM_PROMPT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres`,
    ),
  active: z.boolean(),
})

type AgentFormValues = z.infer<typeof formSchema>

interface AgentFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: AiAgent | null
  organizationId: string
  usedInstanceIds?: string[]
  onSaved?: () => void | Promise<void>
}

export function AgentFormSheet({
  open,
  onOpenChange,
  agent,
  organizationId,
  usedInstanceIds = [],
  onSaved,
}: AgentFormSheetProps) {
  const { user } = useAuth()
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [promptTemplate, setPromptTemplate] = useState('')
  const [preparingWhatsApp, setPreparingWhatsApp] = useState(false)
  const [qrCode, setQrCode] = useState('')

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      instance_id: '',
      provider: 'openai',
      system_prompt: '',
      active: false,
    },
  })

  useEffect(() => {
    const loadInstances = async () => {
      try {
        const data = await getInstances(organizationId)
        setInstances(data)
      } catch (e) {
        console.error(e)
      }
    }
    if (open) void loadInstances()
  }, [open, organizationId])

  const availableInstances = useMemo(
    () =>
      instances.filter(
        (instance) => instance.id === agent?.instance_id || !usedInstanceIds.includes(instance.id),
      ),
    [agent?.instance_id, instances, usedInstanceIds],
  )

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || '',
        instance_id: agent.instance_id,
        provider: agent.provider || 'openai',
        system_prompt: agent.system_prompt,
        active: agent.active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        instance_id: '',
        provider: 'openai',
        system_prompt: '',
        active: false,
      })
    }
    setPromptTemplate('')
    setQrCode('')
  }, [agent, form, open])

  useEffect(() => {
    if (!open || agent || form.getValues('instance_id') || availableInstances.length === 0) return
    form.setValue('instance_id', availableInstances[0].id, { shouldValidate: true })
  }, [agent, availableInstances, form, open])

  const selectedInstanceId = form.watch('instance_id')
  const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId)

  useEffect(() => {
    if (!open || !selectedInstanceId || selectedInstance?.status !== 'connecting') return
    const timer = window.setInterval(async () => {
      try {
        const data = await getInstances(organizationId)
        setInstances(data)
        const current = data.find((instance) => instance.id === selectedInstanceId)
        if (current?.status === 'connected') setQrCode('')
      } catch (_) {
        // A conexão continua visível e será atualizada no próximo ciclo ou via realtime.
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [open, organizationId, selectedInstance?.status, selectedInstanceId])

  const applyPromptTemplate = (templateId: string) => {
    setPromptTemplate(templateId)
    const template = getReceptionistPromptTemplate(templateId)
    if (!template) return
    form.setValue('description', template.description, { shouldDirty: true })
    form.setValue('system_prompt', template.prompt, { shouldDirty: true, shouldValidate: true })
  }

  const prepareWhatsApp = async () => {
    setPreparingWhatsApp(true)
    setQrCode('')
    try {
      const result = await prepareDedicatedInstance(organizationId)
      const instance = result.instance
      setInstances((current) => [instance, ...current.filter((item) => item.id !== instance.id)])
      form.setValue('instance_id', instance.id, { shouldDirty: true, shouldValidate: true })
      const qr = await fetchInstanceQR(instance.id)
      setQrCode(qr.qrcode || '')
      setInstances((current) =>
        current.map((item) =>
          item.id === instance.id ? { ...item, status: qr.status || item.status } : item,
        ),
      )
      toast.success(
        qr.qrcode
          ? 'WhatsApp preparado. Escaneie o QR Code para conectar.'
          : 'WhatsApp preparado. A conexão está sendo iniciada.',
      )
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { message?: string } }).response?.message
          : undefined
      toast.error(message || 'Não foi possível preparar o WhatsApp desta recepcionista.')
    } finally {
      setPreparingWhatsApp(false)
    }
  }

  const onSubmit = async (values: AgentFormValues) => {
    if (!user) return
    try {
      const instanceId = agent?.instance_id || values.instance_id

      if (!instanceId) {
        toast.error('Nenhuma instância conectada. Conecte o WhatsApp primeiro.')
        return
      }

      const instance = instances.find((item) => item.id === instanceId)
      const organizationId = instance?.organization_id

      if (!organizationId) {
        toast.error('A instância ainda não está vinculada a uma empresa.')
        return
      }

      const data: Record<string, unknown> = {
        name: values.name,
        description: values.description || '',
        provider: values.provider,
        system_prompt: values.system_prompt,
        active: values.active,
        user_id: user.id,
        organization_id: organizationId,
        instance_id: instanceId,
      }

      if (agent) {
        await updateAiAgent(agent.id, data)
        toast.success('Agente atualizado com sucesso!')
      } else {
        await createAiAgent(data)
        toast.success('Agente criado com sucesso!')
      }
      await onSaved?.()
      onOpenChange(false)
    } catch (error) {
      const errors = extractFieldErrors(error)
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, msg]) => {
          if (field in formSchema.shape) {
            form.setError(field as keyof AgentFormValues, { message: msg })
          }
        })
      } else {
        toast.error('Ocorreu um erro ao salvar o agente.')
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto bg-white text-neutral-900 dark:bg-[#141414] dark:text-white sm:max-w-md">
        <SheetHeader className="space-y-1 pb-2">
          <SheetTitle className="text-[18px] font-semibold tracking-tight text-zinc-900 dark:text-white">
            {agent ? 'Editar recepcionista' : 'Nova recepcionista'}
          </SheetTitle>
          <SheetDescription className="text-[13.5px] text-zinc-500 dark:text-neutral-400">
            Configure o WhatsApp, o modelo de atendimento e as instruções de IA.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da recepcionista</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Bia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#25D366]" />
                <div>
                  <p className="text-sm font-semibold">WhatsApp desta recepcionista</p>
                  <p className="text-xs text-zinc-500 dark:text-neutral-400">
                    Cada recepcionista utiliza uma conexão exclusiva.
                  </p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="instance_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conexão</FormLabel>
                    {agent ? (
                      <div className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-white/[0.04]">
                        {selectedInstance?.instance_name || 'Conexão vinculada'}
                      </div>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione ou prepare um WhatsApp" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableInstances.map((instance) => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.instance_name} -{' '}
                              {instance.status === 'connected' ? 'conectado' : 'aguardando conexão'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!agent && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={preparingWhatsApp}
                  onClick={() => void prepareWhatsApp()}
                >
                  {preparingWhatsApp ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  Preparar novo WhatsApp
                </Button>
              )}
              {selectedInstance ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-neutral-400">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      selectedInstance.status === 'connected'
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}
                  />
                  {selectedInstance.status === 'connected'
                    ? 'WhatsApp conectado e reservado para esta recepcionista.'
                    : 'Conexão preparada. Escaneie o QR Code antes de ativar.'}
                </div>
              ) : null}
              {qrCode ? (
                <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-zinc-200 dark:bg-white">
                  <img
                    src={qrCode}
                    alt="QR Code para conectar o WhatsApp"
                    className="mx-auto h-52 w-52 object-contain"
                  />
                  <p className="mt-2 text-xs text-zinc-600">
                    WhatsApp → Aparelhos conectados → Conectar aparelho
                  </p>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <FormLabel>Modelo de atendimento</FormLabel>
              <Select value={promptTemplate} onValueChange={applyPromptTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo de prompt" />
                </SelectTrigger>
                <SelectContent>
                  {receptionistPromptTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11.5px] leading-5 text-zinc-500 dark:text-neutral-400">
                O modelo preenche as instruções e pode ser personalizado antes de salvar.
              </p>
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Propósito deste agente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provedor de IA</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um provedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="grok">Grok (xAI)</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-[11.5px] leading-5 text-zinc-500 dark:text-neutral-400">
                A credencial do provedor é gerenciada com segurança no servidor e nunca é enviada ao
                navegador.
              </p>
            </div>
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt (Instruções)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Você é um assistente virtual de vendas..."
                      className="min-h-[150px]"
                      maxLength={SYSTEM_PROMPT_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-right text-[11.5px] text-zinc-500 dark:text-neutral-400">
                    {field.value.length.toLocaleString('pt-BR')} /{' '}
                    {SYSTEM_PROMPT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="mt-2 flex flex-row items-center justify-between rounded-xl bg-zinc-50/60 p-4 ring-1 ring-zinc-200/70 dark:bg-white/[0.04] dark:ring-white/10">
                  <div className="space-y-0.5">
                    <FormLabel className="text-[14px] font-medium text-zinc-900 dark:text-white">
                      Recepcionista ativa
                    </FormLabel>
                    <p className="text-[12.5px] text-zinc-500 dark:text-neutral-400">
                      Ative somente depois de validar as instruções e a integração.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-brand-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-brand-500 hover:bg-[#1EBE5A] text-[#0A0A0A] h-9 px-4 text-[13px] font-medium"
              >
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar recepcionista'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
