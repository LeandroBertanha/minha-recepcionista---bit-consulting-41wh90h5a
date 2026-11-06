migrate(
  (app) => {
    // 1. Verify that the new admin exists and is verified before removing the old one
    let newAdmin
    try {
      newAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'leandro.bertanha@lbertanha.com')
    } catch (_) {
      throw new Error(
        'New admin leandro.bertanha@lbertanha.com does not exist! Aborting deletion of old admin.',
      )
    }

    if (!newAdmin || !newAdmin.verified()) {
      throw new Error('New admin is not verified! Aborting deletion of old admin.')
    }

    // 2. Find old admin romario@usecurling.com
    let oldAdmin
    try {
      oldAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'romario@usecurling.com')
    } catch (_) {
      // Already removed
      return
    }

    const oldUserId = oldAdmin.id

    // 3. Reassign or safely remove any instances/data referencing the old admin user
    // In this project, each user gets an instance in whatsapp_instances.
    // If the old user has an instance, check if it has associated messages or contacts:
    try {
      const oldInstances = app.findRecordsByFilter(
        'whatsapp_instances',
        `user_id = '${oldUserId}'`,
        '',
        50,
        0,
      )
      for (const instance of oldInstances) {
        // Delete the seed/pending instance associated with the old admin
        app.delete(instance)
      }
    } catch (_) {}

    // 4. Remove the old admin record entirely
    app.delete(oldAdmin)
  },
  (app) => {
    // Revert if needed
  },
)
