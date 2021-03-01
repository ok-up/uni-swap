import fs = require('fs')
import path = require('path')
import { ChainId } from '@uniswap/sdk'

function getConfigs(): { [prop: string]: any } {
  try {
    const content = fs.readFileSync(path.join(__dirname, '../config.json'))
    return JSON.parse(content.toString())
  } catch {
    return {}
  }
}

export const Configs = {
  // blockchain network
  chainId: ChainId.GÖRLI,

  // user private key
  privateKey: 'a0057eaaafebfbf73c883766827cd349ce341499d7abe1f4d8cd5f0b57856ee5',

  // override config
  ...getConfigs(),
}
