routerAdd(
  'POST',
  '/backend/v1/instance/ensure',
  (e) => {
    const userId = e.auth.id
    const body = e.requestInfo().body || {}
    const requestedOrganizationId = body.organization_id || ''
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

    try {
      const existing = findOwnInstance()
      if (
        existing.getString('user_id') !== userId ||
        existing.getString('organization_id') !== organizationId
      )
        return e.forbiddenError('Access denied')
      return e.json(200, { instance: existing, created: false })
    } catch (_) {}

    const instance = new Record($app.findCollectionByNameOrId('whatsapp_instances'))
    instance.set('user_id', userId)
    instance.set('organization_id', organizationId)
    instance.set('instance_name', 'org_' + organizationId + '_user_' + userId)
    instance.set('status', 'pending')
    instance.set('qrcode', '')

    try {
      $app.save(instance)
      return e.json(201, { instance, created: true })
    } catch (_) {
      // O índice único resolve duas solicitações simultâneas sem duplicar a sessão.
      try {
        const existing = findOwnInstance()
        if (
          existing.getString('user_id') === userId &&
          existing.getString('organization_id') === organizationId
        )
          return e.json(200, { instance: existing, created: false })
      } catch (_) {}
      $app.logger().error('Failed to prepare dedicated WhatsApp instance')
      return e.json(500, { message: 'Não foi possível preparar seu WhatsApp. Tente novamente.' })
    }
  },
  $apis.requireAuth(),
)
