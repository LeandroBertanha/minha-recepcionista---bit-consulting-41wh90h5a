routerAdd(
  'GET',
  '/backend/v1/integration/status',
  (e) => {
    const evolutionUrlConfigured = Boolean($secrets.get('EVOLUTION_API_URL'))
    const evolutionKeyConfigured = Boolean($secrets.get('EVOLUTION_API_KEY'))
    const webhookUrlConfigured = Boolean($secrets.get('APP_WEBHOOK_URL'))
    const webhookSecretConfigured = Boolean($secrets.get('EVOLUTION_WEBHOOK_SECRET'))

    let instanceStatus = 'missing'
    try {
      const instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', e.auth.id)
      instanceStatus = instance.getString('status') || 'pending'
    } catch (_) {}

    return e.json(200, {
      ready:
        evolutionUrlConfigured &&
        evolutionKeyConfigured &&
        webhookUrlConfigured &&
        webhookSecretConfigured,
      evolution: {
        urlConfigured: evolutionUrlConfigured,
        keyConfigured: evolutionKeyConfigured,
      },
      webhook: {
        urlConfigured: webhookUrlConfigured,
        secretConfigured: webhookSecretConfigured,
      },
      instance: {
        status: instanceStatus,
      },
    })
  },
  $apis.requireAuth(),
)
