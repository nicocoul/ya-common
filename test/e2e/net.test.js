const net = require('net')
const { pause } = require('../common')
const netChannel = require('../../lib/channels/net')
const netPlugin = require('../../lib/plugins/net')

test('it works when ping pong are sent', async () => {
  const port = 8080
  const channel = netChannel.create({ host: 'localhost', port })
  channel.on('connect', () => {
    channel.write(1)
    channel.write(1)
  })
  const received = []
  const server = new net.Server()
  const plugin = netPlugin.create(server)
  plugin.on('new-channel', (channel) => {
    channel.on('data', data => {
      received.push(data)
    })
  })

  server.listen(port)

  await pause(8000)
  plugin.kill()
  channel.kill()
  expect(received).toStrictEqual([1, 1])
}, 10000)
