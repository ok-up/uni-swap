import fs = require('fs')
import path = require('path')
import { ChainId } from '@uniswap/sdk'

function getConfigs(): { [prop: string]: any } {
  let configs: any = {}
  try {
    const content = fs.readFileSync(path.join(__dirname, '../config.json'))
    configs = JSON.parse(content.toString())
  } catch {
    throw new Error('Failed to load file configs')
  }

  if (!configs.privateKey) throw new Error('Missing privateKey')
  if (!configs.inputToken) throw new Error('Missing inputToken')
  if (!configs.outputToken) throw new Error('Missing outputToken')
  if (!configs.amountInputTokenPerSwapTurn) throw new Error('Missing amountInputTokenPerSwapTurn')
  if (!configs.priceInputPerOutputToSwap) throw new Error('Missing priceInputPerOutputToSwap')
  if (!configs.frequencySwappingPerSecond) throw new Error('Missing frequencySwappingPerSecond')

  return configs
}

export type Configurations = {
  chainId: ChainId
  privateKey: string
  deadlineMinutes: number
  slippagePercent: number
  inputToken: string
  outputToken: string
  amountInputTokenPerSwapTurn: string | number
  priceInputPerOutputToSwap: string | number
  frequencySwappingPerSecond: number
  isDisableLog: boolean
}

export const Configs: Configurations = {
  // blockchain network
  chainId: ChainId.GÖRLI,

  // user private key
  privateKey: '',

  // swap deadline
  deadlineMinutes: 20,

  // swap slippage percent x.xx%
  slippagePercent: 0.5,

  // input token to swap
  inputToken: '',

  // output token want to swap
  outputToken: '',

  // amount input token per swap turn
  amountInputTokenPerSwapTurn: '',

  // price inputToken/outputToken to swap
  priceInputPerOutputToSwap: Number.MAX_SAFE_INTEGER,

  // frequencySwappingPerSecond
  frequencySwappingPerSecond: 15,

  isDisableLog: false,

  // override config
  ...getConfigs(),
}
