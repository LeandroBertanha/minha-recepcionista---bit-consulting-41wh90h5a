import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { createAiAgent, updateAiAgent, type AiAgent } from '@/services/ai_agents'
import { getInstances, type WhatsAppInstance } from '@/services/whatsapp'
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

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  provider: z.enum(['gemini', 'openai'], { error: 'Provedor é obrigatório' }),
  api_key: z.string().optional(),
  system_prompt: z.string().min(1, 'Prompt do sistema é obrigatório'),
  active: z.boolean(),
})

type AgentFormValues = z.infer<typeof formSchema>

interface AgentFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: AiAgent | null
  onSaved?: () => void | Promise<void>
}

export function AgentFormSheet({ open, onOpenChange, agent, onSaved }: AgentFormSheetProps) {
  const { user } = useAuth()
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      provider: 'openai',
      api_key: '',
      system_prompt: '',
      active: false,
    },
  })

  useEffect(() => {
    const loadInstances = async () => {
      try {
        const data = await getInstances()
        setInstances(data)
      } catch (e) {
        console.error(e)
      }
    }
    if (open) loadInstances()
  }, [open])

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || '',
        provider: agent.provider || 'openai',
        api_key: '',
        system_prompt: agent.system_prompt,
        active: agent.active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        provider: 'openai',
        api_key: '',
        system_prompt: '',
        active: false,
      })
    }
  }, [agent, form, open])

  const onSubmit = async (values: AgentFormValues) => {
    if (!user) return
    const apiKey = values.api_key?.trim() || ''
    if (!agent && !apiKey) {
      form.setError('api_key', { message: 'Chave da API é obrigatória' })
      return
    }

    try {
      const preferredInstance =
        instances.find((item) => item.status === 'connected') || instances[0]
      const instanceId = agent?.instance_id || preferredInstance?.id || null

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
      if (apiKey) data.api_key = apiKey

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
            {agent ? 'Editar Agente' : 'Novo Agente'}
          </SheetTitle>
          <SheetDescription className="text-[13.5px] text-zinc-500 dark:text-neutral-400">
            Configure as instruções de IA para automação de conversas.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Agente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Assistente de Vendas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectItem value="gemini">Gemini</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{agent ? 'Nova chave da API (opcional)' : 'Chave da API'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={agent ? 'Deixe vazio para manter a chave atual' : 'sk-...'}
                        {...field}
                      />
                    </FormControl>
                    {agent && (
                      <p className="text-[11.5px] text-zinc-500 dark:text-neutral-400">
                        A chave salva nunca é exibida pelo sistema.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      {...field}
                    />
                  </FormControl>
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
                      Agente Ativo
                    </FormLabel>
                    <p className="text-[12.5px] text-zinc-500 dark:text-neutral-400">
                      Ative somente depois de validar as instruções e a chave.
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
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Agente'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
