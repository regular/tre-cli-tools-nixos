const fs = require('fs')
const {join} = require('path')
const ssbKeys = require('ssb-keys')
const ssbClient = require('ssb-client')
const retry = require('dont-stop-believing')
const conf = require('rc')('tre')
const debug = require('debug')('tre-cli-client')

const retryClient = retry(ssbClient)

module.exports = function(cb) {
  const configPath = conf.config
  if (!configPath) {
    return cb(new Error('.trerc not found, use --config CONFIG'))
  }
  const ssbPath = conf.path || join(configPath, '../.tre')
  debug(`datapath: ${ssbPath}`)
  let remote 
  try {
    remote = fs.readFileSync(join(ssbPath, 'address'), 'utf8')
  } catch(err) {
    debug(`no 'remote' file found in ${ssbPath} : ${err.message}`)
  }
  debug(`remote: ${remote}`)
  ssbKeys.load(join(ssbPath, 'secret'), (err, keys) => {
    if (err) return cb(err)
    debug(`public key: ${keys.id}`)
    retryClient(keys, Object.assign(
      {remote},
      conf,
      {manifest: {manifest: 'async'}}
    ), (err, ssb) => {
      if (err) return cb(err)
      debug('getting manifest ...')
      ssb.manifest( (err, manifest) => {
        if (err) return cb(err)
        debug('got manifest')
        ssb.close()
        ssbClient(keys, Object.assign(
          {remote},
          conf,
          {manifest} 
        ), (err, ssb) => {
          if (err) return cb(err)
          cb(null, ssb, conf, keys)
        })
      })
    })
  })
}
