const fs = require('fs')
const {join} = require('path')
const ssbKeys = require('ssb-keys')
const ssbClient = require('ssb-client')
const retry = require('dont-stop-believing')
const conf = require('rc')('tre')
const debug = require('debug')('tre-cli-client')

const retryClient = retry(ssbClient)

module.exports = function(cb) {
  let remote, keys, caps
  if (conf.keyFile) {
    try {
      keys = JSON.parse(fs.readFileSync(conf.keyFile))
    } catch(err) {
      console.error(`Unable to read key file: ${err.message}`)
      return cb(err)
    }
  }
  if (conf.socketPath) {
    debug('socketPath is provided: %s', conf.socketPath)
    remote = `unix:${conf.socketPath}~noauth`
    debug('using remote %s', remote)
    keys = keys || conf.keys || {
      public: 'foobaz',
      private: 'foobaz'
    }
    debug('Using id %s', keys.public)
    caps = conf.caps || {shs: conf.network ? capsFromNetwork(conf.network) : 'foobar'}
    debug('Using caps.shs %s', caps.shs)
  } else {
    debug('socketPath is not provided, we use trerc compatibility mode')
    const configPath = conf.config
    if (!configPath) {
      return cb(new Error('.trerc not found, use --config CONFIG'))
    }
    const ssbPath = conf.path || join(configPath, '../.tre')
    debug(`datapath: ${ssbPath}`)
    try {
      remote = fs.readFileSync(join(ssbPath, 'address'), 'utf8')
    } catch(err) {
      debug(`no 'remote' file found in ${ssbPath} : ${err.message}`)
    }
    debug(`remote: ${remote}`)
    keys = keys || conf.keys || ssbKeys.loadSync(join(ssbPath, 'secret'))
    debug(`public key: ${keys.id}`)
  }
  const configToUse = Object.assign(
    {caps},
    conf,
    {remote},
    {manifest: {manifest: 'async'}}
  )
  debug('Connecting with ssb client conf: %O', configToUse)
  retryClient(keys, configToUse, (err, ssb) => {
    if (err) {
      debug('Failed with error: %s', err.message)
      return cb(err)
    }
    debug('getting manifest ...')
    ssb.manifest( (err, manifest) => {
      if (err) {
        debug('Failed with error: %s', err.message)
        return cb(err)
      }
      debug('got manifest')
      ssb.close()
      debug('Connecting with manifest')
      ssbClient(keys, Object.assign(
        configToUse,
        {manifest} 
      ), (err, ssb) => {
        if (err) {
          debug('Failed with error: %s', err.message)
          return cb(err)
        }
        cb(null, ssb, conf, keys)
      })
    })
  })
}

// --

function capsFromNetwork(n) {
  if (n[0] !== '*') throw new Error('Malformed natwork')
  n = n.slice(1)
  const [caps, postfix] = n.split('.')
  if (Buffer.from(caps, 'base64').length !== 32) throw new Error('Malformed network')
  return caps
}
