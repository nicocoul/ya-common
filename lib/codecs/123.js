'use strict'

const { Transform } = require('stream')
const logger = require('../logger')(__filename)

const headerLength = 6
const footerLength = 1

function encode (obj) {
  const json = JSON.stringify(obj)
  const jsonLength = Buffer.byteLength(json)
  const buffer = Buffer.alloc(headerLength + jsonLength + 1)
  buffer.writeInt8(1, 0)
  buffer.writeUInt32BE(jsonLength, 1)
  buffer.writeInt8(2, 5)
  buffer.write(json, headerLength, 'utf8')
  buffer.writeInt8(3, headerLength + jsonLength)
  return buffer
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
