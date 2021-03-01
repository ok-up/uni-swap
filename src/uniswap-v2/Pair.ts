import { Currency, Fetcher, Pair } from '@uniswap/sdk'
import { wrappedCurrency } from './Utils'
import { Configs } from '../Config'

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export async function fetchPairs(
  currencies: [Currency | undefined, Currency | undefined][],
): Promise<[PairState, Pair | null][]> {
  const { chainId } = Configs

  const tokens = currencies.map(([currencyA, currencyB]) => [
    wrappedCurrency(currencyA, chainId),
    wrappedCurrency(currencyB, chainId),
  ])

  const pairs = await Promise.all(
    tokens.map(async ([tokenA, tokenB]) => {
      if (tokenA && tokenB && !tokenA.equals(tokenB)) {
        try {
          const pair = await Fetcher.fetchPairData(tokenA, tokenB)
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

export async function fetchPair(tokenA?: Currency, tokenB?: Currency): Promise<[PairState, Pair | null]> {
  return (await fetchPairs([[tokenA, tokenB]]))[0]
}
