const { newAccumulator } = require('../common')
const { Readable } = require('stream')
const { newDecoder, newEncoder, encode } = require('../../lib/codecs/123')

const bytesValidJSON = [1, 0, 0, 0, 1, 2, 49, 3]
const bytesInvalidFooter = [1, 0, 0, 0, 1, 2, 49, 4]
const bytesInvalidHeader = [2, 0, 0, 0, 1, 2, 49, 3]
const bytesInvalidJSON = [1, 0, 0, 0, 1, 2, 0, 3]

test('it encodes one object', async () => {
  const acc = newAccumulator()
  Readable.from([1], { objectMode: true }).pipe(newEncoder()).pipe(acc)
  setImmediate(() => {
    expect(acc.data()).toHaveLength(1)
    expect(acc.data()).toStrictEqual([Buffer.from(bytesValidJSON)])
  })
})

test('it encodes multiple objects', async () => {
  const acc = newAccumulator()
  const encoder = newEncoder()
  for (let i = 0; i < 1000; i++) {
    encoder.write(1)
  }
  encoder.pipe(acc)
  setImmediate(() => {
    expect(acc.data()).toHaveLength(1000)
    expect(acc.data()[0]).toStrictEqual(Buffer.from(bytesValidJSON))
  })
})

test('it decodes one buffer', async () => {
  const acc = newAccumulator()
  const decoder = newDecoder()
  Readable.from([Buffer.from(bytesValidJSON)]).pipe(decoder).pipe(acc)
  setImmediate(() => {
    expect(acc.data()).toHaveLength(1)
    expect(acc.data()).toStrictEqual([1])
  })
})

test('it decodes multiple buffers', async () => {
  const acc = newAccumulator()
  const decoder = newDecoder()
  for (let i = 0; i < 1000; i++) {
    decoder.write(Buffer.from(bytesValidJSON))
  }
  decoder.pipe(acc)
  setImmediate(() => {
    expect(acc.data()).toHaveLength(1000)
    expect(acc.data()[0]).toStrictEqual(1)
  })
})

test('it decodes when message is split after the header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)
  decoder.write(validBuffer.slice(0, validBuffer.length - 2))
  decoder.write(validBuffer.slice(validBuffer.length - 2))
  setImmediate(() => {
    expect(acc.data()).toStrictEqual(['hello world'])
  })
})

test('it decodes when message is split in the header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)
  decoder.write(validBuffer.slice(0, 3))
  decoder.write(validBuffer.slice(3))
  setImmediate(() => {
    expect(acc.data()).toStrictEqual(['hello world'])
  })
})

test('it decodes when invalid header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)

  decoder.write(Buffer.from(bytesInvalidHeader))
  decoder.write(validBuffer)
  decoder.write(Buffer.from(bytesInvalidHeader))
  decoder.write(validBuffer)
  setImmediate(() => {
    expect(acc.data()).toStrictEqual(['hello world', 'hello world'])
  })
})

test('it decodes when invalid footer', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)

  decoder.write(Buffer.from(bytesInvalidFooter))
  decoder.write(validBuffer)
  decoder.write(Buffer.from(bytesInvalidFooter))
  decoder.write(validBuffer)
  setImmediate(() => {
    expect(acc.data()).toStrictEqual(['hello world', 'hello world'])
  })
})

test('it decodes multiples messages at once', async () => {
  const validBuffer = Buffer.concat([
    Buffer.from(bytesInvalidHeader),
    encode('hello world1'),
    Buffer.from(bytesInvalidJSON),
    encode('hello world2'),
    Buffer.from(bytesInvalidFooter),
    encode('hello world3'),
    Buffer.from(bytesInvalidFooter),
    Buffer.from(bytesInvalidHeader)
  ])
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)
  decoder.write(validBuffer)
  decoder.write(encode('hello world4'))
  setImmediate(() => {
    expect(acc.data()).toStrictEqual(['hello world1', 'hello world2', 'hello world3', 'hello world4'])
  })
})

test('it decodes when writing buffer of lenght 1', async () => {
  const decoder = newDecoder()
  const arr = [
    ...bytesInvalidHeader,
    ...bytesInvalidJSON,
    ...bytesValidJSON,
    ...bytesInvalidFooter
  ]
  arr.forEach((b) => {
    decoder.write(Buffer.from([b]))
  })
  const acc = newAccumulator()
  decoder.pipe(acc)
  setImmediate(() => {
    expect(acc.data()).toStrictEqual([1])
  })

})
/**/