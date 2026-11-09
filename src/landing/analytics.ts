export type TrackEvent =
  | 'cta_click'
  | 'diagnostic_start'
  | 'diagnostic_step'
  | 'diagnostic_complete'
  | 'signup_click'
  | 'plan_select'
  | 'demo_request'
  | 'checkout_click'

type Props = Record<string, string | number | boolean | null | undefined>

type AnalyticsWindow = {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
}

const metaStandardEvents: Partial<Record<TrackEvent, string>> = {
  diagnostic_complete: 'Lead',
  signup_click: 'CompleteRegistration',
  checkout_click: 'InitiateCheckout',
  demo_request: 'Contact',
}

function getWindow(): AnalyticsWindow | null {
  return typeof window === 'undefined' ? null : (window as unknown as AnalyticsWindow)
}

export function track(event: TrackEvent, props: Props = {}): void {
  const w = getWindow()
  if (!w) return
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event, ...props })
  if (typeof w.gtag === 'function') w.gtag('event', event, props)
  if (typeof w.fbq === 'function') {
    const standard = metaStandardEvents[event]
    if (standard) w.fbq('track', standard, props)
    else w.fbq('trackCustom', event, props)
  }
}

function injectScript(src: string): void {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

let initialized = false

export function initAnalytics(ids: { gaId?: string; metaPixelId?: string }): void {
  const w = getWindow()
  if (!w || initialized) return
  initialized = true

  if (ids.gaId) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids.gaId)}`)
    w.dataLayer = w.dataLayer || []
    w.gtag = function gtag() {
      // gtag.js exige o objeto `arguments`, não um array.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments)
    }
    w.gtag('js', new Date())
    w.gtag('config', ids.gaId)
  }

  if (ids.metaPixelId) {
    const queue: unknown[][] = []
    const fbq = (...args: unknown[]) => {
      const loaded = (fbq as unknown as { callMethod?: (...a: unknown[]) => void }).callMethod
      if (loaded) loaded(...args)
      else queue.push(args)
    }
    Object.assign(fbq, { queue, loaded: true, version: '2.0', push: fbq })
    w.fbq = fbq
    injectScript('https://connect.facebook.net/en_US/fbevents.js')
    w.fbq('init', ids.metaPixelId)
    w.fbq('track', 'PageView')
  }
}

export type LeadSource = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  referrer?: string
  landing_path?: string
}

const SOURCE_KEY = 'mr_lead_source'
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/** Guarda a primeira origem do visitante na sessão para associar ao lead. */
export function captureLeadSource(
  search: string,
  referrer: string,
  path: string,
  storage: Storage,
): LeadSource {
  const existing = storage.getItem(SOURCE_KEY)
  if (existing) {
    try {
      return JSON.parse(existing) as LeadSource
    } catch {
      storage.removeItem(SOURCE_KEY)
    }
  }
  const params = new URLSearchParams(search)
  const source: LeadSource = { landing_path: path }
  for (const key of utmKeys) {
    const value = params.get(key)
    if (value) source[key] = value.slice(0, 120)
  }
  if (referrer) source.referrer = referrer.slice(0, 300)
  storage.setItem(SOURCE_KEY, JSON.stringify(source))
  return source
}
