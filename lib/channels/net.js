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
  let pingTimeout
  let pingIsActive = true
  let reconnectTimeout
  const socket = new net.Socket({ allowHalfOpen: false })
  socket.setKeepAlive(true, pingDelay)
  let destroyed = false

  socket.setNoDelay()

  socket.on('data', (data) => {
    if (Buffer.compare(pBuffer, data) !== 0) {
      decoder.write(data)
    }
  })
  encoder.on('data', data => {
    socket.write(data)
  })

  function startPing () {
    if (pingTimeout) clearTimeout(pingTimeout)
    if (!destroyed) {
      pingTimeout = setTimeout(() => {
        if (pingIsActive) {
          socket.write(pBuffer)
        }
      }, pingDelay)
    }
  }

  function reconnect () {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (!destroyed) {
      reconnectTimeout = setTimeout(() => {
        // logger.debug(`reconnecting to ${JSON.stringify(connectOptions)}`)
        socket.connect(connectOptions)
      }, reconnectDelay)
    }
  }

  socket.on('ready', () => {
    socket.resume()
    pingIsActive = true
    // logger.debug(`channel ${socket.localAddress} ${socket.localPort} connected to ${JSON.stringify(connectOptions)}`)
    channel.emit('connect', `${socket.localAddress}:${socket.localPort}>${JSON.stringify(connectOptions)}`)
  })
  socket.on('error', (error) => {
    logger.error(`socket error ${error.stack}`)
    pingIsActive = false
    reconnect()
  })
  socket.on('close', () => {
    pingIsActive = false
    reconnect()
    channel.emit('close')
  })
  socket.connect(connectOptions)
  startPing()
  channel.kill = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    socket.removeAllListeners()
    encoder.removeAllListeners()
    decoder.removeAllListeners()

    socket.destroy()
    encoder.destroy()
    decoder.destroy()

    destroyed = true
  }
  return channel
}

module.exports = {
  create
}
