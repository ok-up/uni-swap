import { ChainId } from '@uniswap/sdk'

function getConfigs(): { [prop: string]: any } {
  const configs: any = {
    privateKey: process.env.PRIVATE_KEY,
    amountInputTokenPerSwapTurn: process.env.AMOUNT_ETH,
    limitPriceOutputTokenPerOneInputTokenToSwap: process.env.BUY_LIMIT,
    outputToken: process.env.TOKEN_CONTRACT,
    deadlineMinutes: +(process.env.DEADLINE || 20),
    chainId: +process.env.NETWORK,
    slippagePercent: +process.env.SLIPPAGE / 1000,
    frequencySwappingPerSecond: +process.env.INTERVAL,
    inputToken: 'ETH',
  }

  if (!configs.privateKey) throw new Error('Missing PRIVATE_KEY')
  if (!configs.outputToken) throw new Error('Missing TOKEN_CONTRACT')
  if (!configs.amountInputTokenPerSwapTurn) throw new Error('Missing AMOUNT_ETH')
  if (!configs.limitPriceOutputTokenPerOneInputTokenToSwap) throw new Error('Missing BUY_LIMIT')
  if (!configs.frequencySwappingPerSecond) throw new Error('Missing INTERVAL')

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
  limitPriceOutputTokenPerOneInputTokenToSwap: string | number
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
  limitPriceOutputTokenPerOneInputTokenToSwap: Number.MAX_SAFE_INTEGER,

  // frequencySwappingPerSecond
  frequencySwappingPerSecond: 15,

  isDisableLog: false,

  // override config
  ...getConfigs(),
}
