migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const instances = app.findCollectionByNameOrId('whatsapp_instances')

    let record
    let isNewRecord = false

    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro.bertanha@lbertanha.com')
    } catch (_) {
      record = new Record(users)
      record.setEmail('leandro.bertanha@lbertanha.com')
      isNewRecord = true
    }

    if (isNewRecord) {
      const initialPassword = $os.getenv('INITIAL_ADMIN_PASSWORD')
      if (!initialPassword || initialPassword.length < 12) {
        throw new Error('Defina INITIAL_ADMIN_PASSWORD com pelo menos 12 caracteres')
      }
      record.setPassword(initialPassword)
    }

    record.setVerified(true)
    if (!record.getString('name')) {
      record.set('name', 'LEANDRO BERTANHA')
    }
    app.save(record)

    // Garante uma instância inicial sem duplicar registros existentes.
    try {
      app.findFirstRecordByData('whatsapp_instances', 'user_id', record.id)
    } catch (_) {
      const instance = new Record(instances)
      instance.set('user_id', record.id)
      instance.set('instance_name', 'user_' + record.id)
      instance.set('status', 'pending')
      app.save(instance)
    }
  },
  (app) => {
    // O rollback não remove a conta administrativa nem dados relacionados.
  },
)
