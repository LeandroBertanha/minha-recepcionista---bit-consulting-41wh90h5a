migrate(
  (app) => {
    const agents = app.findCollectionByNameOrId('ai_agents')
    if (!agents.fields.getByName('configuration')) {
      agents.fields.add(new JSONField({ name: 'configuration', maxSize: 200000, required: false }))
      app.save(agents)
    }

    try {
      app.findCollectionByNameOrId('agent_knowledge_sources')
      return
    } catch (_) {}

    const organizationAccess =
      "@request.auth.id != '' && organization_id.status = 'active' && " +
      '@collection.organization_members:knowledge_member.organization_id ?= organization_id && ' +
      '@collection.organization_members:knowledge_member.user_id ?= @request.auth.id && ' +
      "@collection.organization_members:knowledge_member.status ?= 'active'"
    const ownerAccess =
      'user_id = @request.auth.id && agent_id.user_id = @request.auth.id && ' +
      'agent_id.organization_id = organization_id && agent_id.instance_id.organization_id = organization_id'
    const writeRole =
      "(@collection.organization_members:knowledge_member.role ?= 'owner' || " +
      "@collection.organization_members:knowledge_member.role ?= 'admin' || " +
      "@collection.organization_members:knowledge_member.role ?= 'supervisor' || " +
      "@collection.organization_members:knowledge_member.role ?= 'agent')"
    const access = organizationAccess + ' && ' + ownerAccess

    const sources = new Collection({
      name: 'agent_knowledge_sources',
      type: 'base',
      listRule: access,
      viewRule: access,
      createRule: access + ' && ' + writeRole,
      updateRule:
        access +
        ' && ' +
        writeRole +
        ' && @request.body.organization_id:changed = false' +
        ' && @request.body.user_id:changed = false' +
        ' && @request.body.agent_id:changed = false',
      deleteRule: access + ' && ' + writeRole,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('users').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'organization_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('organizations').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'agent_id',
          type: 'relation',
          required: true,
          collectionId: agents.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'type', type: 'select', required: true, values: ['file', 'link'], maxSelect: 1 },
        { name: 'name', type: 'text', required: true, max: 255 },
        { name: 'url', type: 'url', required: false },
        {
          name: 'file',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/csv',
            'text/plain',
            'text/markdown',
          ],
        },
        { name: 'content', type: 'text', required: false, max: 100000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['stored', 'ready', 'error'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agent_knowledge_sources_agent ON agent_knowledge_sources (agent_id)',
      ],
    })
    app.save(sources)
  },
  (_app) => {
    // Rollback não destrutivo: fontes e configurações existentes são preservadas.
  },
)
