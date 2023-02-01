'use strict'

const net = require('net')
const { duplexify } = require('../common.js')
const { newEncoder, newDecoder, encode } = require('../codecs/123')
const logger = require('../logger')(__filename)
const pBuffer = encode('pp')

function createSocket (pingDelay) {
  const socket = new net.Socket({ allowHalfOpen: false })
  socket.setKeepAlive(true, pingDelay)
  socket.setTimeout(10 * pingDelay)
  socket.setNoDelay(true)
  return socket
}

function create (connectOptions, reconnectDelay = 50, maxConnectionAttemps = 50) {
  const encoder = newEncoder()
  const decoder = newDecoder()
  const channel = duplexify(decoder, encoder)
  const pingDelay = 5000
  let pingInterval
  let reconnectTimeout
  const socket = createSocket(pingDelay)

  let connectionAttempts = 0

  function startPing () {
    pingInterval = setInterval(() => {
      socket.write(pBuffer)
    }, pingDelay)
  }

  function connect () {
    if (pingInterval) clearInterval(pingInterval)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(() => {
      logger.info(`connect to ${JSON.stringify(connectOptions)}`)
      connectionAttempts++
      socket.connect(connectOptions)
    }, reconnectDelay)
    if (connectionAttempts === maxConnectionAttemps) {
      channel.emit('close')
    }
  }

  function kill () {
    if (pingInterval) clearInterval(pingInterval)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    socket.removeAllListeners()
    encoder.removeAllListeners()
    decoder.removeAllListeners()
    socket.destroy()
    encoder.destroy()
    decoder.destroy()
  }

  socket.on('data', (data) => {
    socket.pause()
    if (Buffer.compare(pBuffer, data) !== 0) {
      decoder.write(data)
    }
    socket.resume()
  })

  socket.on('timeout', () => {
    logger.error(`socket timeout ${socket.localAddress}:${socket.localPort}`)
    connect()
  })

  socket.on('connect', () => {
    logger.info('socket connect')
    channel.emit('connect', `${socket.localAddress}:${socket.localPort}>${JSON.stringify(connectOptions)}`)
  })

  socket.on('ready', () => {
    connectionAttempts = 0
    startPing()
    encoder.pipe(socket)
  })

  socket.on('error', (error) => {
    logger.error(`socket error ${error.code}`)
    encoder.unpipe(socket)
    connect()
  })

  socket.on('close', (error) => {
    logger.warn(`socket close ${error && error.code}`)
    encoder.unpipe(socket)
    connect()
  })

  socket.on('end', () => {
    logger.debug(`socket end ${socket.localAddress}:${socket.localPort}`)
    encoder.unpipe(socket)
    connect()
  })

  connect()

  channel.kill = kill
  return channel
}

module.exports = {
  create
}
