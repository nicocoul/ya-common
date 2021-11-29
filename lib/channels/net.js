'use strict'

const net = require('net')
const { duplexify, newPassTrough } = require('../common.js')
const { newEncoder, newDecoder } = require('../codecs/123')
const logger = require('../logger')(__filename)

function create (connectOptions, reconnectDelay = 50) {
  // logger.debug(`create ${serverHost} ${serverPort} ${reconnectDelay}`)
  const reader = newPassTrough()
  const writer = newPassTrough()
  const encoder = newEncoder()
  const decoder = newDecoder()
  const channel = duplexify(reader, writer)
  let reconnectTimeout
  let socket
  let destroyed = false

  const connect = () => {
    // logger.debug(`connect to ${host} ${port}`)
    socket = new net.Socket()
    socket.setNoDelay()
    socket.on('connect', () => {
      logger.debug(`channel ${socket.localAddress} ${socket.localPort} connected to ${JSON.stringify(connectOptions)}`)
      socket.pipe(decoder).pipe(reader)
      writer.pipe(encoder).pipe(socket)
      channel.emit('connect', `${socket.localAddress}:${socket.localPort}>${JSON.stringify(connectOptions)}`)
    })
    socket.on('error', (error) => {
      logger.error(`socket error ${error.stack}`)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (!destroyed) {
        reconnectTimeout = setTimeout(() => {
          logger.debug(`reconnecting to ${JSON.stringify(connectOptions)}`)
          connect()
        }, reconnectDelay)
      }
    })
    socket.on('close', () => {
      channel.emit('close')
      logger.debug(`channel ${socket.localAddress} ${socket.localPort} disconnected from ${JSON.stringify(connectOptions)}`)
      decoder.unpipe(reader)
      writer.unpipe(encoder)
      socket.destroy()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (!destroyed) {
        reconnectTimeout = setTimeout(() => {
          logger.debug(`reconnecting to ${JSON.stringify(connectOptions)}`)
          connect()
        }, reconnectDelay)
      }
    })
    socket.connect(connectOptions)
  }

  connect()
  channel.kill = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    socket.destroy()
    destroyed = true
  }
  return channel
}

module.exports = {
  create
}
