const net = require('net')
const { pause } = require('../common')
const { create } = require('../../lib/channels/net')

const bytes = [1, 0, 0, 0, 1, 2, 49, 3]
// console.log(buff.concat(buff))
/*
test('it sends messages to the server', async () => {
  const port = 8080
  const server = new net.Server()
  server.listen(port)
  const received = []
  server.on('connection', socket => {
    socket.on('data', (data) => {
      received.push(data)
    })
  })
  const channel = create({ host: 'localhost', port })

  channel.write(1)

  await pause(100)
  expect(received).toHaveLength(1)
  server.close()
  channel.write(2)
  await pause(100)
  server.listen(port)
  await pause(100)
  server.close()
  channel.kill()
  expect(received).toHaveLength(2)
})
*/

test('it sends messages to the server when the server starts listening afterwards', async () => {
  const port = 8080
  const received = []
  const channel = create({ host: 'localhost', port })
  channel.write(1)
  channel.write(1)

  await pause(100)
  const server = new net.Server()
  server.on('connection', socket => {
    socket.on('data', (data) => {
      received.push(data)
    })
  })
  server.listen(port)

  await pause(50)
  server.close()
  channel.kill()
  expect(received).toHaveLength(1)
  expect(received).toStrictEqual([Buffer.from(bytes.concat(bytes))])
})

test('it sends messages to the server when the server starts listening afterwards', async () => {
  const port = 8080
  const received = []
  const channel = create({ host: 'localhost', port })
  channel.on('connect', () => {
    channel.write(1)
    channel.write(1)
  })

  const server = new net.Server()
  server.on('connection', socket => {
    socket.on('data', (data) => {
      received.push(data)
    })
  })
  server.listen(port)

  await pause(50)
  server.close()
  channel.kill()
  expect(received).toHaveLength(1)
  expect(received).toStrictEqual([Buffer.from(bytes.concat(bytes))])
})
