routerAdd(
  'GET',
  '/backend/v1/integration/status',
  (e) => {
    const evolutionUrlConfigured = Boolean($secrets.get('EVOLUTION_API_URL'))
    const evolutionKeyConfigured = Boolean($secrets.get('EVOLUTION_API_KEY'))
    const webhookUrlConfigured = Boolean($secrets.get('APP_WEBHOOK_URL'))
    const webhookSecretConfigured = Boolean($secrets.get('EVOLUTION_WEBHOOK_SECRET'))

    let instanceStatus = 'missing'
    let instanceId = ''
    let instanceUserId = ''
    let provider = null
    try {
      const membership = $app.findFirstRecordByFilter(
        'organization_members',
        'user_id = {:userId} && status = "active"',
        { userId: e.auth.id },
      )
      const organizationId = membership.getString('organization_id')
      const organization = $app.findRecordById('organizations', organizationId)
      if (organization.getString('status') !== 'active') throw new Error('Inactive organization')
      const instance = $app.findFirstRecordByFilter(
        'whatsapp_instances',
        'organization_id = {:organizationId} && user_id = {:userId}',
        { organizationId, userId: e.auth.id },
      )
      if (
        instance.getString('user_id') !== e.auth.id ||
        instance.getString('organization_id') !== organizationId
      )
        throw new Error('Instance ownership mismatch')
      instanceId = instance.id
      instanceUserId = e.auth.id
      instanceStatus = instance.getString('status') || 'pending'
      const role = membership.getString('role')
      if (role === 'owner' || role === 'admin') {
        const apiUrl = ($secrets.get('EVOLUTION_API_URL') || '').replace(/\/$/, '')
        const apiKey = $secrets.get('EVOLUTION_API_KEY') || ''
        if (apiUrl && apiKey) {
          provider = { reachable: false }
          const response = $http.send({
            url:
              apiUrl + '/webhook/find/' + encodeURIComponent(instance.getString('instance_name')),
            method: 'GET',
            headers: { apikey: apiKey },
            timeout: 5,
          })
          if (response.statusCode === 200 && response.json) {
            const config = response.json.webhook || response.json
            const expectedUrl =
              ($secrets.get('APP_WEBHOOK_URL') || '').replace(/\/$/, '') +
              '/backend/v1/webhook/evolution'
            const backendUrl =
              ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '') +
              '/backend/v1/webhook/evolution'
            provider = {
              reachable: true,
              webhookEnabled: config.enabled === true,
              destinationMatches: config.url === expectedUrl,
              backendDestinationMatches: config.url === backendUrl,
              messageEventsEnabled: (config.events || []).indexOf('MESSAGES_UPSERT') !== -1,
              webhookSecretMatches:
                config.headers?.['X-Bitzaap-Webhook-Secret'] ===
                $secrets.get('EVOLUTION_WEBHOOK_SECRET'),
            }
            const connection = $http.send({
              url:
                apiUrl +
                '/instance/connectionState/' +
                encodeURIComponent(instance.getString('instance_name')),
              method: 'GET',
              headers: { apikey: apiKey },
              timeout: 5,
            })
            if (connection.statusCode === 200)
              provider.remoteState = connection.json?.instance?.state || 'unknown'
            const details = $http.send({
              url:
                apiUrl +
                '/instance/fetchInstances?instanceName=' +
                encodeURIComponent(instance.getString('instance_name')),
              method: 'GET',
              headers: { apikey: apiKey },
              timeout: 5,
            })
            if (details.statusCode === 200 && Array.isArray(details.json)) {
              const paired = details.json.find(
                (item) => item.name === instance.getString('instance_name'),
              )
              provider.connectedNumberLast4 = String(paired?.ownerJid || '')
                .split('@')[0]
                .split(':')[0]
                .replace(/\D/g, '')
                .slice(-4)
            }
            const history = $http.send({
              url:
                apiUrl +
                '/chat/findMessages/' +
                encodeURIComponent(instance.getString('instance_name')),
              method: 'POST',
              headers: { apikey: apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ where: {}, page: 1, offset: 20 }),
              timeout: 5,
            })
            if (history.statusCode === 200 && history.json?.messages) {
              const messages = history.json.messages
              provider.messageCount = messages.total
              const latest = (messages.records || [])[0]
              provider.latestMessageTimestamp = latest?.messageTimestamp || null
              provider.latestMessagePayloadType = typeof latest?.message
              provider.testMessageFound = (messages.records || []).some((message) => {
                const payload = message.message?.ephemeralMessage?.message || message.message || {}
                const content = (payload.conversation || payload.extendedTextMessage?.text || '')
                  .trim()
                  .toLowerCase()
                return content === 'teste 2' || content.indexOf('teste minha recepcionista') !== -1
              })
            }
          }
        }
      }
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
        id: instanceId,
        userId: instanceUserId,
        status: instanceStatus,
      },
      provider: provider,
    })
  },
  $apis.requireAuth(),
)
