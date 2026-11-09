import type { LeadSource } from '../analytics.ts'
import type { Contact, DiagnosticAnswers, Diagnosis } from './engine.ts'

export type LeadStage = 'diagnosed' | 'plan_selected' | 'signup' | 'checkout' | 'trial' | 'demo'

export type LeadRecord = {
  id: string
  contact: Contact
  company: { name: string; segment: string }
  answers: DiagnosticAnswers
  diagnosis: Diagnosis
  diagnosisSource: 'ai' | 'rules'
  recommendedPlan: string | null
  planInterest: string | null
  source: LeadSource & { origin: string }
  funnelStage: LeadStage
  consent: boolean
  createdAt: string
}

export type DiagnosisResult = {
  diagnosis: Diagnosis
  diagnosisSource: 'ai' | 'rules'
  delivered: boolean
}

const STORAGE_KEY = 'mr_leads'

/**
 * Endpoint externo opcional (CRM, n8n, Make, função serverless). Recebe o lead em JSON e pode
 * devolver `{ diagnosis }` gerado por IA; sem endpoint, o lead fica salvo apenas no navegador.
 */
function leadsEndpoint(): string | null {
  const url = import.meta.env.VITE_LEADS_ENDPOINT as string | undefined
  return url ? url : null
}

function saveLocally(lead: LeadRecord): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LeadRecord[]
    const next = [...all.filter((l) => l.id !== lead.id), lead].slice(-20)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Armazenamento indisponível (modo privado): o lead segue apenas na sessão.
  }
}

function isDiagnosis(value: unknown): value is Diagnosis {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    typeof d.currentSituation === 'string' &&
    typeof d.recommendation === 'string' &&
    Array.isArray(d.painPoints)
  )
}

export function createLeadId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function submitLead(lead: LeadRecord): Promise<DiagnosisResult> {
  saveLocally(lead)
  const endpoint = leadsEndpoint()
  if (!endpoint) return { diagnosis: lead.diagnosis, diagnosisSource: 'rules', delivered: false }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'lead.diagnosed', lead }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && isDiagnosis(data?.diagnosis)) {
      const updated = { ...lead, diagnosis: data.diagnosis, diagnosisSource: 'ai' as const }
      saveLocally(updated)
      return { diagnosis: data.diagnosis, diagnosisSource: 'ai', delivered: true }
    }
    return { diagnosis: lead.diagnosis, diagnosisSource: 'rules', delivered: res.ok }
  } catch {
    return { diagnosis: lead.diagnosis, diagnosisSource: 'rules', delivered: false }
  }
}

export async function updateLeadStage(
  lead: LeadRecord,
  stage: LeadStage,
  planId?: string,
): Promise<LeadRecord> {
  const updated: LeadRecord = {
    ...lead,
    funnelStage: stage,
    planInterest: planId ?? lead.planInterest,
  }
  saveLocally(updated)
  const endpoint = leadsEndpoint()
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lead.stage_changed',
          lead_id: lead.id,
          stage,
          plan_id: planId ?? null,
        }),
      })
    } catch {
      // O estágio já foi salvo localmente; a sincronização externa é melhor esforço.
    }
  }
  return updated
}
