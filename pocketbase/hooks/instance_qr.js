routerAdd(
  'GET',
  '/backend/v1/instance/{id}/qr',
  (e) => {
    const id = e.request.pathValue('id')
    let instance
    try {
      instance = $app.findRecordById('whatsapp_instances', id)
    } catch (_) {
      return e.notFoundError('Instance not found')
    }

    const organizationId = instance.getString('organization_id')
    let hasOrganizationAccess = false
    try {
      const organization = $app.findRecordById('organizations', organizationId)
      hasOrganizationAccess = organization.getString('owner_id') === e.auth?.id
    } catch (_) {}

    if (!hasOrganizationAccess) {
      try {
        const membership = $app.findFirstRecordByFilter(
          'organization_members',
          'organization_id = {:organizationId} && user_id = {:userId} && status = "active"',
          { organizationId: organizationId, userId: e.auth?.id || '' },
        )
        const role = membership.getString('role')
        hasOrganizationAccess = role === 'owner' || role === 'admin'
      } catch (_) {}
    }

    if (!hasOrganizationAccess) {
      return e.forbiddenError('Access denied')
    }

    let evoUrl = ($secrets.get('EVOLUTION_API_URL') || '').replace(/\/$/, '')
    const evoKey = $secrets.get('EVOLUTION_API_KEY')
    const instanceName = instance.getString('instance_name')
    const webhookUrl = ($secrets.get('APP_WEBHOOK_URL') || '').replace(/\/$/, '')
    const webhookSecret = $secrets.get('EVOLUTION_WEBHOOK_SECRET') || ''
    if (!evoUrl || !evoKey || !webhookUrl || !webhookSecret) {
      return e.json(503, { message: 'Conclua a configuração da integração no Skip Cloud.' })
    }
    try {
      const name = encodeURIComponent(instanceName)
      const request = (path, method, body) =>
        $http.send({
          url: evoUrl + path,
          method: method || 'GET',
          headers: { apikey: evoKey, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
          timeout: 20,
        })
      const ok = (res) => res.statusCode >= 200 && res.statusCode < 300
      const reject = (res, step) => {
        $app.logger().error('Evolution request failed', 'step', step, 'status', res.statusCode)
        return e.json(502, {
          message:
            'A Evolution API recusou a solicitação (' + step + ', HTTP ' + res.statusCode + ').',
          upstreamStatus: res.statusCode,
        })
      }
      const webhook = {
        enabled: true,
        url: webhookUrl + '/backend/v1/webhook/evolution',
        byEvents: false,
        base64: false,
        events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        headers: { 'X-Bitzaap-Webhook-Secret': webhookSecret },
      }
      let state = request('/instance/connectionState/' + name)
      let created = null
      if (state.statusCode === 404) {
        created = request('/instance/create', 'POST', {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook,
        })
        if (!ok(created)) return reject(created, 'criação da instância')
      } else if (!ok(state)) {
        return reject(state, 'consulta da instância')
      }
      const webhookRes = request('/webhook/set/' + name, 'POST', { webhook })
      if (!ok(webhookRes)) return reject(webhookRes, 'configuração do webhook')
      const createdQr = created?.json?.qrcode?.base64 || created?.json?.base64
      const isOpen = state.json?.instance?.state === 'open'
      const res = isOpen ? state : createdQr ? created : request('/instance/connect/' + name)
      if (!ok(res) || !res.json) return reject(res, 'geração do QR Code')
      const qr = res.json.base64 || res.json.qrcode?.base64
      if (qr) {
        instance.set('qrcode', qr)
        instance.set('status', 'connecting')
      } else if (isOpen || res.json.instance?.state === 'open') {
        instance.set('status', 'connected')
        instance.set('qrcode', '')
      } else if (typeof res.json.count === 'number' || res.json.instance?.state === 'connecting') {
        instance.set('status', 'connecting')
        instance.set('qrcode', '')
        $app.saveNoValidate(instance)
        return e.json(202, { status: 'connecting', qrcode: '', pending: true })
      } else {
        return e.json(502, {
          message: 'A Evolution API não retornou um QR Code válido. Tente novamente.',
        })
      }
      $app.saveNoValidate(instance)
    } catch (err) {
      const diagnostic = String(err)
        .split(evoKey)
        .join('[redacted]')
        .split(webhookSecret)
        .join('[redacted]')
      $app.logger().error('Evolution QR transport error', 'error', diagnostic)
      return e.json(502, {
        message:
          'Não foi possível acessar a Evolution API. Verifique o servidor e tente novamente.',
        diagnostic,
      })
    }
    return e.json(200, {
      status: instance.getString('status'),
      qrcode: instance.getString('qrcode'),
    })
  },
  $apis.requireAuth(),
)
