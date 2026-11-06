migrate(
  (app) => {
    const ownedCollections = ['whatsapp_contacts', 'whatsapp_messages', 'ai_agents']

    for (const collectionName of ownedCollections) {
      const collection = app.findCollectionByNameOrId(collectionName)
      collection.createRule = "@request.auth.id != '' && user_id = @request.auth.id"
      collection.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
      app.save(collection)
    }
  },
  (app) => {
    const contacts = app.findCollectionByNameOrId('whatsapp_contacts')
    contacts.createRule = "@request.auth.id != ''"
    contacts.updateRule = "@request.auth.id != ''"
    app.save(contacts)

    const messages = app.findCollectionByNameOrId('whatsapp_messages')
    messages.createRule = "@request.auth.id != ''"
    messages.updateRule = "@request.auth.id != ''"
    app.save(messages)

    const agents = app.findCollectionByNameOrId('ai_agents')
    agents.createRule = "@request.auth.id != ''"
    agents.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(agents)
  },
)
