cronAdd('whatsapp_connection_health', '*/15 * * * *', () => {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace('T', ' ')
  const stale = $app.findRecordsByFilter(
    'whatsapp_instances',
    'status != "connected" && updated <= {:staleBefore}',
    '-updated',
    100,
    0,
    { staleBefore },
  )

  if (!stale.length) return

  const counters = { pending: 0, connecting: 0, disconnected: 0, other: 0 }
  for (const instance of stale) {
    const status = instance.getString('status') || 'pending'
    if (Object.prototype.hasOwnProperty.call(counters, status)) counters[status]++
    else counters.other++
  }

  const sampleIds = stale
    .slice(0, 5)
    .map((instance) => instance.id)
    .join(',')

  console.warn(
    'WhatsApp connection health stale=' +
      stale.length +
      ' pending=' +
      counters.pending +
      ' connecting=' +
      counters.connecting +
      ' disconnected=' +
      counters.disconnected +
      ' other=' +
      counters.other +
      ' sampleIds=' +
      sampleIds,
  )
})
