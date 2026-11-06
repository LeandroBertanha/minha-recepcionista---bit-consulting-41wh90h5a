migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const instances = app.findCollectionByNameOrId('whatsapp_instances')

    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro.bertanha@lbertanha.com')
    } catch (_) {
      record = new Record(users)
      record.setEmail('leandro.bertanha@lbertanha.com')
    }

    record.setPassword('lbc26173$qTv3$')
    record.setVerified(true)
    if (!record.getString('name')) {
      record.set('name', 'LEANDRO BERTANHA')
    }
    app.save(record)

    // Check if a whatsapp_instance exists for this user, if not create one
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
    // Revert logic if needed (leave unchanged or handled if necessary)
  },
)
