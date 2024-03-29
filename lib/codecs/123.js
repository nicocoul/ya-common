'use strict'

const { Transform } = require('stream')
const safeStringify = require('fast-safe-stringify')
const logger = require('../logger')(__filename)

const headerLength = 6
const footerLength = 1

function encode (obj) {
  const str = safeStringify(obj)
  const header = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x02])
  const body = Buffer.from(str, 'utf8')
  const footer = Buffer.from([0x03])

  header.writeUInt32BE(body.length, 1)

  return Buffer.concat([header, body, footer])
}

function decode (bytes) {
  if ((bytes[0] !== 0x01) || (bytes[5] !== 0x02)) {
    console.error('Invalid frame header', bytes)
    throw new Error('Invalid frame header')
  }

  if (bytes[bytes.length - 1] !== 0x03) {
    throw new Error('Invalid frame footer')
  }

  return JSON.parse(bytes.slice(6, bytes.length - 1).toString('utf8'))
}

function newDecoder () {
  const result = new Transform({ objectMode: true })
  let acc = Buffer.from([])

  result._transform = (chunk, _, callback) => {
    try {
      acc = Buffer.concat([acc, chunk])

      while (acc.length > headerLength) {
        if ((acc[0] !== 0x01) || (acc[5] !== 0x02)) {
          logger.warn('Invalid frame header')
          acc = Buffer.from(acc.slice(1))
        } else {
          const messageLength = acc.readUInt32BE(1)
          const frameLength = headerLength + messageLength + footerLength
          if (acc.length >= frameLength) {
            if (acc[frameLength - 1] !== 0x03) {
              logger.warn('Invalid frame footer')
              acc = Buffer.from(acc.slice(frameLength))
            } else {
              try {
                result.push(JSON.parse(acc.toString('utf8', headerLength, messageLength + headerLength)))
              } catch (error) {
                logger.warn(error.stack)
              }
              acc = Buffer.from(acc.slice(frameLength))
            }
          } else {
            // cannot process anything more
            break
          }
        }
      }
      callback()
    } catch (error) {
      logger.error(error.stack)
      acc = Buffer.from([])
      callback()
    }
  }
  return result
}

function newEncoder () {
  const result = new Transform({ objectMode: true })

  result._transform = (obj, _, callback) => {
    result.push(encode(obj))
    callback()
  }
  return result
}

module.exports = {
  encode,
  decode,
  newDecoder,
  newEncoder
}
