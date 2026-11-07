// Cria uma instância por organização e provisiona a integração na Evolution API.
onRecordAfterCreateSuccess(
  (e) => {
    // Safely get the collection name to avoid TypeError
    let colName = ''
    if (e.collection && e.collection.name) {
      colName = e.collection.name
    } else if (e.record && typeof e.record.collection === 'function') {
      const col = e.record.collection()
      if (col) colName = col.name
    } else if (e.record && e.record.collectionName) {
      colName = e.record.collectionName
    }

    if (colName === 'organization_members') {
      try {
        const role = e.record.getString('role')
        if (e.record.getString('status') !== 'active' || (role !== 'owner' && role !== 'admin')) {
          return e.next()
        }

        const userId = e.record.getString('user_id')
        const organizationId = e.record.getString('organization_id')
        if (!userId || !organizationId) return e.next()

        try {
          $app.findFirstRecordByData('whatsapp_instances', 'organization_id', organizationId)
          return e.next()
        } catch (_) {}

        const instancesCol = $app.findCollectionByNameOrId('whatsapp_instances')
        const instanceRecord = new Record(instancesCol)
        instanceRecord.set('user_id', userId)
        instanceRecord.set('organization_id', organizationId)
        instanceRecord.set('instance_name', 'org_' + organizationId)
        instanceRecord.set('status', 'pending')
        $app.saveNoValidate(instanceRecord)
      } catch (err) {
        $app
          .logger()
          .error('Failed to create whatsapp_instance for organization', 'error', String(err))
      }
      return e.next()
    }

    if (colName === 'whatsapp_instances') {
      try {
        const instanceName = e.record.getString('instance_name')
        if (!instanceName) return e.next()

        let evoUrl = $secrets.get('EVOLUTION_API_URL') || ''
        const evoKey = $secrets.get('EVOLUTION_API_KEY') || ''
        let webhookUrl = $secrets.get('APP_WEBHOOK_URL') || ''
        const webhookSecret = $secrets.get('EVOLUTION_WEBHOOK_SECRET') || ''

        if (evoUrl.endsWith('/')) {
          evoUrl = evoUrl.slice(0, -1)
        }
        if (webhookUrl.endsWith('/')) {
          webhookUrl = webhookUrl.slice(0, -1)
        }

        if (evoUrl && evoKey) {
          const createBody = {
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }

          if (webhookUrl && webhookSecret) {
            createBody.webhook = {
              url: webhookUrl + '/backend/v1/webhook/evolution',
              byEvents: false,
              base64: false,
              enabled: true,
              events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
              headers: {
                'X-Bitzaap-Webhook-Secret': webhookSecret,
              },
            }
          }

          const createRes = $http.send({
            url: evoUrl + '/instance/create',
            method: 'POST',
            headers: { apikey: evoKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(createBody),
            timeout: 15,
          })

          if (createRes.statusCode >= 200 && createRes.statusCode < 300) {
            if (webhookUrl && webhookSecret) {
              const webhookRes = $http.send({
                url: evoUrl + '/webhook/set/' + instanceName,
                method: 'POST',
                headers: { apikey: evoKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  webhook: {
                    enabled: true,
                    url: webhookUrl + '/backend/v1/webhook/evolution',
                    byEvents: false,
                    base64: false,
                    events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
                    headers: {
                      'X-Bitzaap-Webhook-Secret': webhookSecret,
                    },
                  },
                }),
                timeout: 15,
              })

              if (webhookRes.statusCode < 200 || webhookRes.statusCode >= 300) {
                let rawBody = ''
                try {
                  if (webhookRes.body) rawBody = new TextDecoder().decode(webhookRes.body)
                } catch (_) {}

                $app
                  .logger()
                  .error(
                    'Evolution API Webhook Call Failed',
                    'statusCode',
                    webhookRes.statusCode,
                    'response',
                    webhookRes.json ? JSON.stringify(webhookRes.json) : rawBody,
                  )
              }
            }
          } else {
            let rawBody = ''
            try {
              if (createRes.body) rawBody = new TextDecoder().decode(createRes.body)
            } catch (_) {}

            $app
              .logger()
              .error(
                'Evolution API Instance Call Failed',
                'statusCode',
                createRes.statusCode,
                'response',
                createRes.json ? JSON.stringify(createRes.json) : rawBody,
              )
          }
        }
      } catch (err) {
        $app.logger().error('Evolution API Call Transport Failed', 'error', String(err))
      }
      return e.next()
    }

    return e.next()
  },
  'organization_members',
  'whatsapp_instances',
)
