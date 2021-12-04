'use strict'

const net = require('net')
const { duplexify } = require('../common.js')
const { newEncoder, newDecoder } = require('../codecs/123')
const logger = require('../logger')(__filename)

function create (connectOptions, reconnectDelay = 50) {
  const encoder = newEncoder()
  const decoder = newDecoder()
  const channel = duplexify(decoder, encoder)
  let reconnectTimeout
  const socket = new net.Socket({ allowHalfOpen: false })
  socket.setKeepAlive(true, 5000)
  let destroyed = false

  socket.setNoDelay()

  socket.on('data', (data) => {
    decoder.write(data)
  })
  encoder.on('data', data => {
    socket.write(data)
  })

  socket.on('ready', () => {
    socket.resume()
    // logger.debug(`channel ${socket.localAddress} ${socket.localPort} connected to ${JSON.stringify(connectOptions)}`)
    channel.emit('connect', `${socket.localAddress}:${socket.localPort}>${JSON.stringify(connectOptions)}`)
  })
  socket.on('error', (error) => {
    logger.error(`socket error ${error.stack}`)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (!destroyed) {
      reconnectTimeout = setTimeout(() => {
        // logger.debug(`reconnecting to ${JSON.stringify(connectOptions)}`)
        socket.connect(connectOptions)
      }, reconnectDelay)
    }
  })
  socket.on('close', () => {
    // logger.debug(`channel ${socket.localAddress} ${socket.localPort} disconnected from ${JSON.stringify(connectOptions)}`)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (!destroyed) {
      reconnectTimeout = setTimeout(() => {
        // logger.debug(`reconnecting to ${JSON.stringify(connectOptions)}`)
        socket.connect(connectOptions)
      }, reconnectDelay)
    }
    channel.emit('close')
  })
  socket.connect(connectOptions)
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
