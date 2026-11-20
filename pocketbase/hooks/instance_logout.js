routerAdd(
  'POST',
  '/backend/v1/instance/logout',
  (e) => {
    if (!e.auth) {
      return e.unauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body || {}
    const instanceId = typeof body.instance_id === 'string' ? body.instance_id.trim() : ''
    if (!instanceId) {
      return e.json(400, { message: 'Informe a instância do WhatsApp que será desconectada.' })
    }

    let instance
    try {
      instance = $app.findRecordById('whatsapp_instances', instanceId)
      const organizationId = instance.getString('organization_id')
      const membership = $app.findFirstRecordByFilter(
        'organization_members',
        'organization_id = {:organizationId} && user_id = {:userId} && status = "active" && (role = "owner" || role = "admin")',
        { organizationId, userId: e.auth.id },
      )
      const organization = $app.findRecordById('organizations', organizationId)
      if (
        !membership ||
        organization.getString('status') !== 'active' ||
        instance.getString('user_id') !== e.auth.id ||
        instance.getString('organization_id') !== organizationId
      )
        return e.forbiddenError('Access denied')
    } catch (err) {
      return e.forbiddenError('Access denied')
    }

    const apiUrl = $secrets.get('EVOLUTION_API_URL')
    const apiKey = $secrets.get('EVOLUTION_API_KEY')
    const apiOrigin = (
      $secrets.get('EVOLUTION_API_ORIGIN') || 'https://airecepcionista.com.br'
    ).replace(/\/$/, '')

    if (!apiUrl || !apiKey) {
      return e.json(503, { message: 'Evolution API configuration missing' })
    }

    let url = apiUrl
    if (url.endsWith('/')) url = url.slice(0, -1)
    url = `${url}/instance/logout/${instance.getString('instance_name')}`

    try {
      const res = $http.send({
        url: url,
        method: 'DELETE',
        headers: {
          apikey: apiKey,
          Origin: apiOrigin,
          'Content-Type': 'application/json',
        },
        timeout: 10,
      })

      if (res.statusCode < 200 || res.statusCode >= 300) {
        $app.logger().error('Evolution API logout returned error', 'status', res.statusCode)
        return e.json(502, { message: 'Evolution API rejected the logout request' })
      }
    } catch (err) {
      $app.logger().error('Evolution API logout failed (network)', 'error', String(err))
      return e.json(502, { message: 'Evolution API is unavailable' })
    }

    instance.set('status', 'disconnected')
    instance.set('qrcode', '')
    $app.save(instance)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
