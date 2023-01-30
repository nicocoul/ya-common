'use strict'

const { Transform } = require('stream')

function newDecoder () {
  const result = new Transform({ objectMode: true })
  result._transform = (chunk, _, callback) => {
    try {
      result.push(JSON.parse(chunk))
    } catch (error) {
      console.error(error)
    }
    callback()
  }
  return result
}

function newEncoder () {
  const result = new Transform({ objectMode: true })

  result._transform = (obj, _, callback) => {
    try {
      result.push(JSON.stringify(obj))
    } catch (error) {
      console.error(error)
    }
    callback()
  }
  return result
}

module.exports = {
  newDecoder,
  newEncoder
}
