migrate(
  (app) => {
    const instances = app.findCollectionByNameOrId('whatsapp_instances')
    const agents = app.findCollectionByNameOrId('ai_agents')

    const hasIndexName = (statement, name) =>
      new RegExp(
        '\\bINDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["`\\[]?' + name + '["`\\]]?\\s',
        'i',
      ).test(statement)

    const assignedInstances = new Map()
    for (const agent of app.findAllRecords('ai_agents')) {
      const instanceId = agent.getString('instance_id')
      if (!instanceId) throw new Error('A recepcionista ' + agent.id + ' não possui WhatsApp.')
      if (assignedInstances.has(instanceId)) {
        throw new Error(
          'A instância ' +
            instanceId +
            ' está vinculada a mais de uma recepcionista: ' +
            assignedInstances.get(instanceId) +
            ' e ' +
            agent.id +
            '.',
        )
      }
      assignedInstances.set(instanceId, agent.id)
    }

    instances.indexes = (instances.indexes || []).filter(
      (index) => !hasIndexName(index, 'idx_whatsapp_instances_org_user'),
    )
    instances.indexes.push(
      'CREATE INDEX idx_whatsapp_instances_org_user ON whatsapp_instances (organization_id, user_id)',
    )
    app.save(instances)

    agents.indexes = (agents.indexes || []).filter(
      (index) => !hasIndexName(index, 'idx_ai_agents_instance_unique'),
    )
    agents.indexes.push(
      'CREATE UNIQUE INDEX idx_ai_agents_instance_unique ON ai_agents (instance_id)',
    )
    app.save(agents)
  },
  (_app) => {
    // Rollback não destrutivo: não remove instâncias nem recepcionistas já criadas.
  },
)
