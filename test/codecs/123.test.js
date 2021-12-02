const { pause, newAccumulator } = require('../common')
const { Readable } = require('stream')
const {
  newDecoder,
  newEncoder
} = require('../../lib/codecs/123')

const bytes = [1, 0, 0, 0, 1, 2, 49, 3]

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
