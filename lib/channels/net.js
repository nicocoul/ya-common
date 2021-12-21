'use strict'

const net = require('net')
const { duplexify } = require('../common.js')
const { newEncoder, newDecoder, encode } = require('../codecs/123')
const logger = require('../logger')(__filename)
const pBuffer = encode('pp')
function create (connectOptions, reconnectDelay = 50) {
  const encoder = newEncoder()
  const decoder = newDecoder()
  const channel = duplexify(decoder, encoder)
  const pingDelay = 5000
  let pingInterval
  let reconnectTimeout
  const socket = new net.Socket({ allowHalfOpen: false })
  socket.setKeepAlive(true, pingDelay)
  socket.setTimeout(10 * pingDelay)
  let killed = false
  let connected = false

  socket.setNoDelay()

  socket.on('data', (data) => {
    if (Buffer.compare(pBuffer, data) !== 0) {
      decoder.write(data)
    }
  })
  socket.on('timeout', () => {
    if (!killed) {
      logger.error(`socket timeout ${socket.localAddress}:${socket.localPort}`)
      reconnect()
      channel.emit('close')
    }
  })

  encoder.on('data', data => {
    socket.write(data)
  })

  function startPing () {
    pingInterval = setInterval(() => {
      if (connected) {
        socket.write(pBuffer)
      }
    }, pingDelay)
  }

  function reconnect () {
    connected = false
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (!killed) {
      reconnectTimeout = setTimeout(() => {
        try {
          socket.end()
        } catch (error) {
          logger.error(`error on ending socket ${error.stack}`)
        }
        try {
          socket.destroy()
        } catch (error) {
          logger.error(`error on destroying socket ${error.stack}`)
        }
        logger.info(`reconnecting to ${JSON.stringify(connectOptions)}`)
        socket.connect(connectOptions)
      }, reconnectDelay)
    }
  }
  socket.on('connect', () => {
    connected = true
    logger.info(`connected to ${JSON.stringify(connectOptions)}`)
    channel.emit('connect', `${socket.localAddress}:${socket.localPort}>${JSON.stringify(connectOptions)}`)
  })
  socket.on('ready', () => {
    socket.resume()
  })
  socket.on('error', (error) => {
    logger.error(`socket error ${error.stack}`)
    reconnect()
  })
  socket.on('close', () => {
    reconnect()
    channel.emit('close')
  })
  socket.on('end', () => {
    logger.debug(`socket end ${socket.localAddress}:${socket.localPort}`)
    reconnect()
    channel.emit('close')
  })
  socket.connect(connectOptions)
  startPing()

  channel.kill = () => {
    if (pingInterval) clearInterval(pingInterval)
    socket.removeAllListeners()
    encoder.removeAllListeners()
    decoder.removeAllListeners()

    socket.destroy()
    encoder.destroy()
    decoder.destroy()

    killed = true
  }
  return channel
}

module.exports = {
  create
}
