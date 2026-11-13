cronAdd('crm_status_updates', '*/1 * * * *', () => {
  const fiveMinsAgoStr = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ')

  const inConv = $app.findRecordsByFilter(
    'whatsapp_contacts',
    "(status = 'in_conversation' || status = '') && last_message_at != '' && last_message_at <= {:date}",
    '-created',
    100,
    0,
    { date: fiveMinsAgoStr },
  )

  for (const contact of inConv) {
    contact.set('status', 'waiting')
    $app.save(contact)
  }

  const fifteenMinsAgoStr = new Date(Date.now() - 15 * 60 * 1000).toISOString().replace('T', ' ')

  const waiting = $app.findRecordsByFilter(
    'whatsapp_contacts',
    "status = 'waiting' && updated <= {:date}",
    '-created',
    100,
    0,
    { date: fifteenMinsAgoStr },
  )

  for (const contact of waiting) {
    try {
      const instanceId = contact.getString('instance_id')
      const organizationId = contact.getString('organization_id')
      const instance = $app.findRecordById('whatsapp_instances', instanceId)
      if (instance.getString('organization_id') !== organizationId) continue
      const messages = $app.findRecordsByFilter(
        'whatsapp_messages',
        'contact_id = {:contactId} && instance_id = {:instanceId} && organization_id = {:organizationId}',
        'created',
        50,
        0,
        { contactId: contact.id, instanceId, organizationId },
      )

      let historyText = messages
        .map((m) => {
          const dir = m.getString('direction') === 'in' ? 'Cliente' : 'Agente'
          return `${dir}: ${m.getString('body')}`
        })
        .join('\n')

      if (!historyText.trim()) historyText = 'Sem mensagens.'

      let provider = 'openai'
      let apiKey = ''
      try {
        const agent = $app.findFirstRecordByFilter(
          'ai_agents',
          'organization_id = {:organizationId} && instance_id = {:instanceId} && user_id = {:userId} && active = true',
          {
            organizationId,
            instanceId,
            userId: instance.getString('user_id'),
          },
        )
        provider = agent.getString('provider')
        apiKey = agent.getString('api_key')
      } catch (err) {}

      let newStatus = 'resolved'

      if (apiKey) {
        const aiPrompt = `Analise o seguinte histórico de conversa do WhatsApp e classifique o status do lead.
Responda APENAS com a palavra "resolved" se a dúvida foi resolvida, o atendimento foi finalizado com sucesso ou a conversa chegou a um fim natural.
Responda APENAS com a palavra "lost" se o cliente desistiu, parou de responder no meio de um fluxo de venda/atendimento sem resolução, ou não tem mais interesse.

Histórico:
${historyText}`

        if (provider === 'openai') {
          const res = $http.send({
            url: 'https://api.openai.com/v1/responses',
            method: 'POST',
            body: JSON.stringify({
              model: 'gpt-6-luna',
              input: aiPrompt,
              max_output_tokens: 16,
              store: false,
            }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + apiKey,
            },
          })
          const output = res.json && res.json.output
          if (res.statusCode === 200 && output && output.length > 0) {
            const textParts = []
            for (const item of output) {
              if (item.type !== 'message' || !item.content) continue
              for (const content of item.content) {
                if (content.type === 'output_text' && content.text) textParts.push(content.text)
              }
            }
            const answer = textParts.join('\n').toLowerCase()
            if (answer.includes('lost')) newStatus = 'lost'
          }
        } else if (provider === 'gemini') {
          const aiUrl =
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
            apiKey
          const res = $http.send({
            url: aiUrl,
            method: 'POST',
            body: JSON.stringify({
              contents: [{ parts: [{ text: aiPrompt }] }],
            }),
            headers: { 'Content-Type': 'application/json' },
          })
          if (res.statusCode === 200 && res.json && res.json.candidates && res.json.candidates[0]) {
            const answer = res.json.candidates[0].content.parts[0].text.toLowerCase()
            if (answer.includes('lost')) newStatus = 'lost'
          }
        }
      }

      contact.set('status', newStatus)
      $app.save(contact)
    } catch (e) {
      const errorType = e && e.name ? e.name : 'classification_failed'
      $app
        .logger()
        .error('Error in AI classification', 'contact', contact.id, 'error_type', errorType)
      contact.set('status', 'resolved')
      $app.save(contact)
    }
  }
})
