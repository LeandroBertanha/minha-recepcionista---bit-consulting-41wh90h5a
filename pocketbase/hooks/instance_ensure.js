routerAdd(
  'POST',
  '/backend/v1/instance/ensure',
  (e) => {
    const userId = e.auth.id
    const body = e.requestInfo().body || {}
    const requestedOrganizationId = body.organization_id || ''
    const dedicated = body.dedicated === true
    let organizationId

    try {
      const membership = $app.findFirstRecordByFilter(
        'organization_members',
        'user_id = {:userId} && status = "active"' +
          (requestedOrganizationId ? ' && organization_id = {:organizationId}' : ''),
        { userId, organizationId: requestedOrganizationId },
      )
      const role = membership.getString('role')
      if (role !== 'owner' && role !== 'admin') return e.forbiddenError('Access denied')
      organizationId = membership.getString('organization_id')
      const organization = $app.findRecordById('organizations', organizationId)
      if (organization.getString('status') !== 'active') return e.forbiddenError('Access denied')
    } catch (_) {
      return e.forbiddenError('Access denied')
    }

    const findOwnInstance = () =>
      $app.findFirstRecordByFilter(
        'whatsapp_instances',
        'organization_id = {:organizationId} && user_id = {:userId}',
        { organizationId, userId },
      )

    if (!dedicated) {
      try {
        const existing = findOwnInstance()
        if (
          existing.getString('user_id') !== userId ||
          existing.getString('organization_id') !== organizationId
        )
          return e.forbiddenError('Access denied')
        return e.json(200, { instance: existing, created: false })
      } catch (_) {}
    }

    if (dedicated) {
      try {
        const ownedInstances = $app.findRecordsByFilter(
          'whatsapp_instances',
          'organization_id = {:organizationId} && user_id = {:userId}',
          '-created',
          20,
          0,
          { organizationId, userId },
        )
        if (ownedInstances.length >= 20) {
          return e.json(409, {
            message:
              'O limite de conexões deste usuário foi atingido. Revise as recepcionistas existentes.',
          })
        }
      } catch (_) {}
    }

    const instance = new Record($app.findCollectionByNameOrId('whatsapp_instances'))
    instance.set('user_id', userId)
    instance.set('organization_id', organizationId)
    instance.set(
      'instance_name',
      'org_' +
        organizationId +
        '_user_' +
        userId +
        (dedicated ? '_' + $security.randomString(8) : ''),
    )
    instance.set('status', 'pending')
    instance.set('qrcode', '')

    try {
      $app.save(instance)
      return e.json(201, { instance, created: true })
    } catch (_) {
      // No modo legado, uma solicitação simultânea pode ter preparado a conexão principal.
      if (!dedicated) {
        try {
          const existing = findOwnInstance()
          if (
            existing.getString('user_id') === userId &&
            existing.getString('organization_id') === organizationId
          )
            return e.json(200, { instance: existing, created: false })
        } catch (_) {}
      }
      $app.logger().error('Failed to prepare dedicated WhatsApp instance')
      return e.json(500, { message: 'Não foi possível preparar seu WhatsApp. Tente novamente.' })
    }
  },
  $apis.requireAuth(),
)
