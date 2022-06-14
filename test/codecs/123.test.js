const { pause, newAccumulator } = require('../common')
const { Readable } = require('stream')
const {
  newDecoder,
  newEncoder,
  encode
} = require('../../lib/codecs/123')

const bytes = [1, 0, 0, 0, 1, 2, 49, 3]
const bytesInvalidFooter = [1, 0, 0, 0, 1, 2, 49, 4]
const bytesInvalidHeader = [2, 0, 0, 0, 1, 2, 49, 3]
const bytesInvalidJSON = [1, 0, 0, 0, 1, 2, 0, 3]

test('it encodes one object', async () => {
  const acc = newAccumulator()
  Readable.from([1], { objectMode: true }).pipe(newEncoder()).pipe(acc)
  await pause(0)
  expect(acc.data()).toHaveLength(1)
  expect(acc.data()).toStrictEqual([Buffer.from(bytes)])
})

test('it encodes multiple objects', async () => {
  const acc = newAccumulator()
  const encoder = newEncoder()
  for (let i = 0; i < 1000; i++) {
    encoder.write(1)
  }
  encoder.pipe(acc)
  await pause(0)
  expect(acc.data()).toHaveLength(1000)
  expect(acc.data()[0]).toStrictEqual(Buffer.from(bytes))
})

test('it decodes one buffer', async () => {
  const acc = newAccumulator()
  const decoder = newDecoder()
  Readable.from([Buffer.from(bytes)]).pipe(decoder).pipe(acc)
  await pause(0)
  expect(acc.data()).toHaveLength(1)
  expect(acc.data()).toStrictEqual([1])
})

test('it decodes multiple buffers', async () => {
  const acc = newAccumulator()
  const decoder = newDecoder()
  for (let i = 0; i < 1000; i++) {
    decoder.write(Buffer.from(bytes))
  }
  decoder.pipe(acc)
  await pause(0)
  expect(acc.data()).toHaveLength(1000)
  expect(acc.data()[0]).toStrictEqual(1)
})

test('it decodes when message is split after the header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)
  decoder.write(validBuffer.slice(0, validBuffer.length - 2))
  await pause(10)
  decoder.write(validBuffer.slice(validBuffer.length - 2))
  await pause(10)
  expect(acc.data()).toStrictEqual(['hello world'])
})

test('it decodes when message is split in the header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)
  decoder.write(validBuffer.slice(0, 3))
  await pause(10)
  decoder.write(validBuffer.slice(3))
  await pause(10)
  expect(acc.data()).toStrictEqual(['hello world'])
})

test('it decodes when invalid header', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)

  decoder.write(Buffer.from(bytesInvalidHeader))
  await pause(10)
  decoder.write(validBuffer)
  await pause(10)
  decoder.write(Buffer.from(bytesInvalidHeader))
  await pause(10)
  decoder.write(validBuffer)
  await pause(10)
  expect(acc.data()).toStrictEqual(['hello world', 'hello world'])
})

test('it decodes when invalid footer', async () => {
  const validBuffer = encode('hello world')
  const acc = newAccumulator()
  const decoder = newDecoder()
  decoder.pipe(acc)

  decoder.write(Buffer.from(bytesInvalidFooter))
  await pause(10)
  decoder.write(validBuffer)
  await pause(10)
  decoder.write(Buffer.from(bytesInvalidFooter))
  await pause(10)
  decoder.write(validBuffer)
  await pause(10)
  expect(acc.data()).toStrictEqual(['hello world', 'hello world'])
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
  await pause(10)
  decoder.write(encode('hello world4'))
  await pause(10)
  expect(acc.data()).toStrictEqual(['hello world1', 'hello world2', 'hello world3', 'hello world4'])
})
