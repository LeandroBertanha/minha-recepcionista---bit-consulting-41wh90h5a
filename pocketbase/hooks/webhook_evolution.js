routerAdd('POST', '/backend/v1/webhook/evolution', (e) => {
  const configuredSecret = $secrets.get('EVOLUTION_WEBHOOK_SECRET') || ''
  const receivedSecret = e.request.header.get('X-Bitzaap-Webhook-Secret') || ''

  if (!configuredSecret) {
    $app.logger().error('Evolution webhook rejected because its secret is not configured')
    return e.json(503, { ok: false, error: 'Webhook not configured' })
  }

  if (receivedSecret !== configuredSecret) {
    $app.logger().warn('Evolution webhook rejected due to invalid authentication')
    return e.json(401, { ok: false, error: 'Unauthorized' })
  }

  const body = e.requestInfo().body
  if (!body) return e.json(200, { ok: true })

  const instanceName = body.instance
  if (!instanceName) return e.json(200, { ok: true })

  console.info(
    'Evolution webhook event',
    body.event || 'unknown',
    'hasMessage',
    !!body.data?.message,
  )

  try {
    const instance = $app.findFirstRecordByData('whatsapp_instances', 'instance_name', instanceName)
    const userId = instance.getString('user_id')
    const organizationId = instance.getString('organization_id')
    if (!organizationId) throw new Error('Instance without organization')

    if (body.event === 'qrcode.updated' || body.event === 'QRCODE_UPDATED') {
      const qr = body.data?.qrcode?.base64 || body.data?.base64
      if (qr && instance.getString('status') !== 'connected') {
        instance.set('qrcode', qr)
        instance.set('status', 'connecting')
        $app.saveNoValidate(instance)
      }
      return e.json(200, { ok: true })
    }
    if (body.event === 'connection.update' || body.event === 'CONNECTION_UPDATE') {
      const state = body.data?.state
      if (state === 'open') {
        instance.set('status', 'connected')
        instance.set('qrcode', '')
        $app.saveNoValidate(instance)
      } else if (state === 'close' || state === 'refused') {
        instance.set('status', 'disconnected')
        instance.set('qrcode', '')
        $app.saveNoValidate(instance)
      }
      return e.json(200, { ok: true })
    }

    if (body.event === 'messages.upsert' || body.event === 'MESSAGES_UPSERT') {
      const msgData = body.data?.message
      if (!msgData) return e.json(200, { ok: true })

      const remoteJid = body.data?.key?.remoteJid
      if (!remoteJid || remoteJid === 'status@broadcast') return e.json(200, { ok: true })

      const fromMe = body.data?.key?.fromMe
      const messageId = body.data?.key?.id
      if (!messageId) return e.json(200, { ok: true })
      const pushName = body.data?.pushName || remoteJid.split('@')[0]

      // A Evolution pode reenviar o mesmo evento durante reconexões. A
      // deduplicação precisa ocorrer antes de baixar mídia ou alterar o
      // contato, garantindo idempotência completa da repetição.
      try {
        $app.findFirstRecordByFilter(
          'whatsapp_messages',
          'organization_id = {:organizationId} && instance_id = {:instanceId} && message_id = {:messageId}',
          { organizationId, instanceId: instance.id, messageId },
        )
        return e.json(200, { ok: true, duplicate: true })
      } catch (_) {}

      let type = 'text'
      let mimeType = ''
      let fileName = ''
      let mediaBase64 = ''
      let text = ''

      const extFromMime = (mt) => {
        if (!mt) return ''
        const sub = mt.split(';')[0].split('/')[1] || ''
        if (sub === 'jpeg') return 'jpg'
        if (sub === 'mpeg') return 'mp3'
        if (sub === 'quicktime') return 'mov'
        if (sub.indexOf('ogg') !== -1) return 'ogg'
        return sub
      }

      if (msgData.imageMessage) {
        type = 'image'
        mimeType = msgData.imageMessage.mimetype || 'image/jpeg'
        text = msgData.imageMessage.caption || ''
        fileName = 'image.' + (extFromMime(mimeType) || 'jpg')
      } else if (msgData.audioMessage) {
        type = 'audio'
        mimeType = msgData.audioMessage.mimetype || 'audio/ogg'
        fileName = 'audio.' + (extFromMime(mimeType) || 'ogg')
      } else if (msgData.documentMessage) {
        type = 'document'
        mimeType = msgData.documentMessage.mimetype || 'application/octet-stream'
        fileName = msgData.documentMessage.fileName || 'document'
        text = msgData.documentMessage.caption || ''
      } else if (msgData.videoMessage) {
        type = 'video'
        mimeType = msgData.videoMessage.mimetype || 'video/mp4'
        text = msgData.videoMessage.caption || ''
        fileName = 'video.' + (extFromMime(mimeType) || 'mp4')
      } else {
        if (msgData.conversation) text = msgData.conversation
        else if (msgData.extendedTextMessage?.text) text = msgData.extendedTextMessage.text
      }

      if (type !== 'text') {
        const evoUrl = $secrets.get('EVOLUTION_API_URL')
        const evoKey = $secrets.get('EVOLUTION_API_KEY')
        if (evoUrl && evoKey) {
          try {
            let evoUrlSanitized = evoUrl
            if (evoUrlSanitized.endsWith('/')) evoUrlSanitized = evoUrlSanitized.slice(0, -1)

            const mediaRes = $http.send({
              url: evoUrlSanitized + '/chat/getBase64FromMediaMessage/' + instanceName,
              method: 'POST',
              headers: { apikey: evoKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: {
                  key: body.data?.key,
                  message: msgData,
                },
                convertToMp4: false,
              }),
              timeout: 30,
            })

            const ok = mediaRes.statusCode >= 200 && mediaRes.statusCode < 300
            if (ok && mediaRes.json && mediaRes.json.base64) {
              mediaBase64 = mediaRes.json.base64
            } else {
              let rawBody = ''
              try {
                if (mediaRes.body) rawBody = new TextDecoder().decode(mediaRes.body)
              } catch (_) {}
              $app
                .logger()
                .warn(
                  'getBase64FromMediaMessage Failed',
                  'instance',
                  instanceName,
                  'statusCode',
                  mediaRes.statusCode,
                  'response',
                  mediaRes.json ? JSON.stringify(mediaRes.json) : rawBody,
                )
            }
          } catch (e) {
            $app.logger().warn('Failed to fetch media base64', 'error', String(e))
          }
        }
      }

      let contact
      try {
        const records = $app.findRecordsByFilter(
          'whatsapp_contacts',
          'organization_id = {:organizationId} && instance_id = {:instanceId} && remote_jid = {:jid}',
          '-created',
          1,
          0,
          { organizationId, instanceId: instance.id, jid: remoteJid },
        )
        if (records.length > 0) {
          contact = records[0]
        } else {
          throw new Error('Not found')
        }
      } catch (_) {
        const contactsCol = $app.findCollectionByNameOrId('whatsapp_contacts')
        contact = new Record(contactsCol)
        contact.set('user_id', userId)
        contact.set('organization_id', organizationId)
        contact.set('instance_id', instance.id)
        contact.set('remote_jid', remoteJid)
        contact.set('name', pushName)
        contact.set('phone', remoteJid.split('@')[0])
      }

      contact.set('last_message', type !== 'text' ? '📷 Mídia' : text)
      contact.set('last_message_at', new Date().toISOString())
      $app.saveNoValidate(contact)

      const msgsCol = $app.findCollectionByNameOrId('whatsapp_messages')
      const msgRecord = new Record(msgsCol)
      msgRecord.set('user_id', userId)
      msgRecord.set('organization_id', organizationId)
      msgRecord.set('instance_id', instance.id)
      msgRecord.set('contact_id', contact.id)
      msgRecord.set('remote_jid', remoteJid)
      msgRecord.set('message_id', messageId)
      msgRecord.set('direction', fromMe ? 'out' : 'in')
      msgRecord.set('body', text)
      msgRecord.set('type', type)
      msgRecord.set('mime_type', mimeType)
      msgRecord.set('file_name', fileName)
      msgRecord.set('caption', text)
      msgRecord.set('sent_at', new Date().toISOString())

      if (mediaBase64) {
        try {
          const b64 = mediaBase64.replace(/[^A-Za-z0-9+/=]/g, '')
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          const lookup = new Uint8Array(256)
          for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i

          let bufferLength = b64.length * 0.75
          if (b64[b64.length - 1] === '=') bufferLength--
          if (b64[b64.length - 2] === '=') bufferLength--

          const bytes = new Uint8Array(bufferLength)
          let p = 0
          for (let i = 0; i < b64.length; i += 4) {
            let encoded1 = lookup[b64.charCodeAt(i)]
            let encoded2 = lookup[b64.charCodeAt(i + 1)]
            let encoded3 = lookup[b64.charCodeAt(i + 2)]
            let encoded4 = lookup[b64.charCodeAt(i + 3)]
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
            if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
            if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
          }
          msgRecord.set('media_file', $filesystem.fileFromBytes(bytes, fileName || 'media'))
        } catch (e) {
          $app.logger().warn('Failed to parse media base64', 'error', String(e))
        }
      }

      $app.saveNoValidate(msgRecord)
    }
  } catch (err) {
    $app.logger().error('Webhook Error', 'error', String(err))
    console.error('Evolution webhook processing failed', String(err))
    return e.json(500, { ok: false, error: 'Message processing failed' })
  }

  return e.json(200, { ok: true })
})
