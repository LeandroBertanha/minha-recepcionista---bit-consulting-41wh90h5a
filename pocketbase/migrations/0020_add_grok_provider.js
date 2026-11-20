migrate(
  (app) => {
    const agents = app.findCollectionByNameOrId('ai_agents')
    const provider = agents.fields.getByName('provider')

    if (provider && !provider.values.includes('grok')) {
      provider.values = [...provider.values, 'grok']
      app.save(agents)
    }
  },
  (app) => {
    const agents = app.findCollectionByNameOrId('ai_agents')
    const provider = agents.fields.getByName('provider')

    if (provider && provider.values.includes('grok')) {
      provider.values = provider.values.filter((value) => value !== 'grok')
      app.save(agents)
    }
  },
)
