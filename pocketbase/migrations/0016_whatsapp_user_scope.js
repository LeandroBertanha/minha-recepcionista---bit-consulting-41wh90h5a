migrate(
  (app) => {
    // O callback de migration recebe um app transacional. Nenhum registro operacional é alterado.
    const instances = app.findCollectionByNameOrId('whatsapp_instances')
    const contacts = app.findCollectionByNameOrId('whatsapp_contacts')
    const messages = app.findCollectionByNameOrId('whatsapp_messages')
    const agents = app.findCollectionByNameOrId('ai_agents')

    const optionalCollection = (name) => {
      try {
        return app.findCollectionByNameOrId(name)
      } catch (_) {
        return null
      }
    }
    const documents = optionalCollection('agent_documents')
    const chunks = optionalCollection('agent_document_chunks')
    if (chunks && !documents) {
      throw new Error('Não é possível proteger os trechos sem a coleção de documentos.')
    }

    // Não escolher, renomear ou apagar uma sessão existente para resolver duplicidades.
    const instanceOwners = new Map()
    for (const instance of app.findAllRecords('whatsapp_instances')) {
      const organizationId = instance.getString('organization_id')
      const userId = instance.getString('user_id')
      if (!organizationId || !userId) {
        throw new Error('A instância ' + instance.id + ' precisa de organização e proprietário.')
      }
      const ownerKey = organizationId + ':' + userId
      if (instanceOwners.has(ownerKey)) {
        throw new Error(
          'Há mais de uma instância para o mesmo usuário na organização: ' +
            instanceOwners.get(ownerKey) +
            ' e ' +
            instance.id +
            '. Revise as sessões antes de aplicar a migration.',
        )
      }
      instanceOwners.set(ownerKey, instance.id)
    }

    // O mesmo alias correlaciona empresa, usuário, status e papel ao mesmo vínculo.
    const member = '@collection.organization_members:whatsapp_member.'
    const organizationAccess = (organizationField) =>
      "@request.auth.id != '' && " +
      organizationField +
      ".status = 'active' && " +
      member +
      'organization_id ?= ' +
      organizationField +
      ' && ' +
      member +
      'user_id ?= @request.auth.id && ' +
      member +
      "status ?= 'active'"
    const writeRole =
      '(' +
      member +
      "role ?= 'owner' || " +
      member +
      "role ?= 'admin' || " +
      member +
      "role ?= 'supervisor' || " +
      member +
      "role ?= 'agent')"
    const adminRole = '(' + member + "role ?= 'owner' || " + member + "role ?= 'admin')"
    const immutableOwner =
      '@request.body.organization_id:changed = false && @request.body.user_id:changed = false'
    const immutableInstance = immutableOwner + ' && @request.body.instance_id:changed = false'

    const hasIndexName = (statement, name) =>
      new RegExp(
        '\\bINDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["`\\[]?' + name + '["`\\]]?\\s',
        'i',
      ).test(statement)
    const setIndex = (collection, name, statement) => {
      collection.indexes = (collection.indexes || []).filter((index) => !hasIndexName(index, name))
      collection.indexes.push(statement)
    }

    instances.listRule = organizationAccess('organization_id') + ' && user_id = @request.auth.id'
    instances.viewRule = instances.listRule
    instances.createRule = null
    instances.updateRule = null
    instances.deleteRule = null
    setIndex(
      instances,
      'idx_whatsapp_instances_org_user',
      'CREATE UNIQUE INDEX idx_whatsapp_instances_org_user ON whatsapp_instances (organization_id, user_id)',
    )
    app.save(instances)

    const instanceReadAccess =
      organizationAccess('organization_id') +
      ' && instance_id.user_id = @request.auth.id && instance_id.organization_id = organization_id'
    contacts.listRule = instanceReadAccess
    contacts.viewRule = contacts.listRule
    contacts.createRule = null
    contacts.updateRule = instanceReadAccess + ' && ' + writeRole + ' && ' + immutableInstance
    contacts.deleteRule = instanceReadAccess + ' && ' + adminRole
    // Contatos legados duplicados são preservados; o webhook faz a busca por sessão e JID.
    setIndex(
      contacts,
      'idx_whatsapp_contacts_instance_jid',
      'CREATE INDEX idx_whatsapp_contacts_instance_jid ON whatsapp_contacts (instance_id, remote_jid)',
    )
    app.save(contacts)

    // user_id da mensagem pode representar o atendente que enviou uma mensagem histórica.
    // A sessão determina a propriedade, sem reatribuir mensagens anteriores.
    messages.listRule =
      instanceReadAccess +
      ' && contact_id.instance_id = instance_id && contact_id.organization_id = organization_id'
    messages.viewRule = messages.listRule
    messages.createRule = null
    messages.updateRule = null
    messages.deleteRule = null
    const mediaFile = messages.fields.getByName('media_file')
    if (mediaFile) mediaFile.protected = true
    setIndex(
      messages,
      'idx_whatsapp_messages_instance_message',
      'CREATE UNIQUE INDEX idx_whatsapp_messages_instance_message ON whatsapp_messages (instance_id, message_id)',
    )
    // Criar a proteção composta antes de remover a unicidade global, dentro da mesma transação.
    app.save(messages)
    messages.indexes = (messages.indexes || []).filter((index) => !hasIndexName(index, 'idx_wm_id'))
    app.save(messages)

    const agentReadAccess = instanceReadAccess + ' && user_id = @request.auth.id'
    agents.listRule = agentReadAccess
    agents.viewRule = agentReadAccess
    agents.createRule = agentReadAccess + ' && ' + writeRole
    agents.updateRule = agentReadAccess + ' && ' + writeRole + ' && ' + immutableInstance
    agents.deleteRule = agentReadAccess + ' && ' + adminRole
    app.save(agents)

    if (documents) {
      const documentReadAccess =
        organizationAccess('organization_id') +
        ' && user_id = @request.auth.id && agent_id.user_id = @request.auth.id' +
        ' && agent_id.instance_id.user_id = @request.auth.id' +
        ' && agent_id.organization_id = organization_id' +
        ' && agent_id.instance_id.organization_id = organization_id'
      documents.listRule = documentReadAccess
      documents.viewRule = documentReadAccess
      documents.createRule = documentReadAccess + ' && ' + writeRole
      documents.updateRule =
        documentReadAccess +
        ' && ' +
        writeRole +
        ' && ' +
        immutableOwner +
        ' && @request.body.agent_id:changed = false'
      documents.deleteRule = documentReadAccess + ' && ' + adminRole
      app.save(documents)
    }

    if (chunks) {
      chunks.listRule =
        organizationAccess('document_id.organization_id') +
        ' && document_id.user_id = @request.auth.id' +
        ' && document_id.agent_id.user_id = @request.auth.id' +
        ' && document_id.agent_id.instance_id.user_id = @request.auth.id' +
        ' && document_id.agent_id.organization_id = document_id.organization_id' +
        ' && document_id.agent_id.instance_id.organization_id = document_id.organization_id'
      chunks.viewRule = chunks.listRule
      chunks.createRule = null
      chunks.updateRule = null
      chunks.deleteRule = null
      app.save(chunks)
    }
  },
  (_app) => {
    // Rollback não destrutivo: não remove dados nem reabre acesso às sessões de outros usuários.
  },
)
