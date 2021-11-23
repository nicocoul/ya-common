'use strict'

const channelNet = require('./lib/channels/net')
const channelWs = require('./lib/channels/ws')
const pluginNet = require('./lib/plugins/net')
const pluginWs = require('./lib/plugins/ws')
const codec123 = require('./lib/codecs/123')
const codecWs = require('./lib/codecs/ws')
const common = require('./lib/common')
const logger = require('./lib/logger')
const constants = require('./lib/constants')

module.exports = {
  channels: {
    net: channelNet.create,
    ws: channelWs.create
  },
  plugins: {
    net: pluginNet.create,
    ws: pluginWs.create
  },
  codecs: {
    123: codec123,
    ws: codecWs
  },
  common,
  logger,
  constants
}
