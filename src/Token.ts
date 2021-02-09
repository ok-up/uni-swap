import { Fetcher, ChainId, Token } from '@uniswap/sdk'
import { Configs } from './Config'
import { isAddress } from './Utils'

const DEFAULT_TOKEN_LIST = require('@uniswap/default-token-list/build/uniswap-default.tokenlist.json')
const UNSUPPORT_TOKEN_LIST = require('../uniswap-v2-unsupported.tokenlist.json')

export type TokenAddressMap = Readonly<{ [chainId in ChainId]: Readonly<{ [tokenAddress: string]: Token }> }>

const EMPTY_LIST: TokenAddressMap = {
  [ChainId.KOVAN]: {},
  [ChainId.RINKEBY]: {},
  [ChainId.ROPSTEN]: {},
  [ChainId.GÖRLI]: {},
  [ChainId.MAINNET]: {},
}

function listToTokenMap(list): TokenAddressMap {
  const map = list.tokens.reduce(
    (tokenMap, tokenInfo) => {
      const token = new Token(
        tokenInfo.chainId,
        tokenInfo.address,
        tokenInfo.decimals,
        tokenInfo.symbol,
        tokenInfo.name,
      )
      return {
        ...tokenMap,
        [token.chainId]: {
          ...tokenMap[token.chainId],
          [token.address]: token,
        },
      }
    },
    { ...EMPTY_LIST },
  )
  return map
}

const defaultTokens = listToTokenMap(DEFAULT_TOKEN_LIST)

export const UNSUPPORT_TOKENS = listToTokenMap(UNSUPPORT_TOKEN_LIST)

export async function getToken(address: string) {
  if (!isAddress(address)) {
    const symbol = address.toUpperCase()
    const token = Object.values(defaultTokens[Configs.chainId]).find((token) => symbol === token.symbol)
    !token && console.log('Not found token...', address)
    return token || null
  }
  const token = defaultTokens[Configs.chainId][address]
  if (token) return token
  try {
    const fetchToken = await Fetcher.fetchTokenData(Configs.chainId, address)
    return fetchToken
  } catch (err) {
    console.log('Not found token...', address)
    return null
  }
}
