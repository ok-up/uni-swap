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
  privateKey: 'f843e6df25e4d8ddc54b731df8dc4a2b0138e74967f59f3f099e61ca59479136',

  // swap deadline
  deadlineMinutes: 20,

  // swap slippage percent x.xx%
  slippagePercent: 0.5,

  // override config
  ...getConfigs(),
}
