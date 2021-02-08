import { Currency, Fetcher, Pair, TokenAmount } from '@uniswap/sdk'
import { wrappedCurrency } from './Utils'
import { Configs } from './Config'
import { getReserves } from './Reserves'

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export async function fetchPairs(currencies: [Currency | undefined, Currency | undefined][]) {
  const { chainId } = Configs

  const tokens = currencies.map(([currencyA, currencyB]) => [
    wrappedCurrency(currencyA, chainId),
    wrappedCurrency(currencyB, chainId),
  ])

  // console.log(tokens)
  const pairs = await Promise.all(
    tokens.map(async ([tokenA, tokenB]) => {
      if (tokenA && tokenB && !tokenA.equals(tokenB)) {
        try {
          const reserves = await getReserves(tokenA, tokenB)
          const [reserve0, reserve1] = reserves
          const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

          // const pair = await Fetcher.fetchPairData(tokenA, tokenB)
          const pair = new Pair(new TokenAmount(token0, reserve0), new TokenAmount(token1, reserve1))

          return pair
        } catch (err) {
          // console.log(err, tokenA, tokenB)
        }
      }
      return undefined
    }),
  )

  return pairs.map((pair) => {
    if (!pair) return [PairState.NOT_EXISTS, null]
    const tokenA = pair.token0
    const tokenB = pair.token1
    if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
    return [PairState.EXISTS, pair]
  })
}
