migrate(
  (app) => {
    const agents = app.findCollectionByNameOrId('ai_agents')
    const apiKey = agents.fields.getByName('api_key')

    if (!apiKey) {
      throw new Error('O campo api_key da coleção ai_agents não foi encontrado.')
    }

    // A chave continua disponível para os hooks internos, mas deixa de ser
    // serializada nas respostas da API, inclusive create, update e realtime.
    apiKey.hidden = true
    app.save(agents)
  },
  (app) => {
    const agents = app.findCollectionByNameOrId('ai_agents')
    const apiKey = agents.fields.getByName('api_key')
    if (!apiKey) return

    apiKey.hidden = false
    app.save(agents)
  },
)
