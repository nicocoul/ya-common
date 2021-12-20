'use strict'

const EventEmitter = require('events')
const { duplexify } = require('../common.js')
const { newEncoder, newDecoder, encode } = require('../codecs/123')
const logger = require('../logger')(__filename)

const pBuffer = encode('pp')
const pingDelay = 5000

function create (server) {
  const result = new EventEmitter()
  let connections = 0
  server.on('connection', (socket) => {
    connections++
    const encoder = newEncoder()
    const decoder = newDecoder()
    const channel = duplexify(decoder, encoder)
    channel.id = socket.remoteAddress ? `net-${socket.remoteAddress}:${socket.remotePort}` : `netipc-${connections}`
    let timeout
    socket.on('data', (data) => {
      if (Buffer.compare(pBuffer, data) === 0) {
        socket.write(pBuffer)
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          socket.destroy()
        }, 2 * pingDelay)
      } else {
        decoder.write(data)
      }
    })
    encoder.on('data', data => {
      socket.write(data)
    })

    socket.on('error', error => {
      logger.error(`${socket.remoteAddress} ${socket.remotePort} ${error.stack}`)
    })
    socket.on('close', () => {
      socket.removeAllListeners()
      encoder.removeAllListeners()
      decoder.removeAllListeners()

      socket.destroy()
      encoder.destroy()
      decoder.destroy()
      result.emit('lost-channel', channel)
    })
    result.emit('new-channel', channel)
  })
  server.on('error', (error) => {
    logger.error(error.stack)
  })
  server.on('close', () => {
    logger.info('close')
  })
  result.kill = () => {
    server.close()
  }
  return result
}

module.exports = { create }
