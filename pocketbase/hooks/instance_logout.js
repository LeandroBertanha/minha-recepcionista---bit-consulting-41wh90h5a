routerAdd(
  'POST',
  '/backend/v1/instance/logout',
  (e) => {
    if (!e.auth) {
      return e.unauthorizedError('Unauthorized')
    }

    let instance
    try {
      instance = $app.findFirstRecordByData('whatsapp_instances', 'user_id', e.auth.id)
    } catch (err) {
      return e.notFoundError('Instance not found')
    }

    const apiUrl = $secrets.get('EVOLUTION_API_URL')
    const apiKey = $secrets.get('EVOLUTION_API_KEY')

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
