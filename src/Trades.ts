import { Currency, Pair, Token, CurrencyAmount, Trade, Percent, currencyEquals } from '@uniswap/sdk'
import {
  BASES_TO_CHECK_TRADES_AGAINST,
  CUSTOM_BASES,
  BETTER_TRADE_LESS_HOPS_THRESHOLD,
  ZERO_PERCENT,
  ONE_HUNDRED_PERCENT,
} from './Constants'
import { wrappedCurrency } from './Utils'
import { fetchPairs, PairState } from './Pairs'
import { Configs } from './Config'
import { UNSUPPORT_TOKENS } from './Token'

async function useAllCommonPairs(currencyA?: Currency, currencyB?: Currency): Promise<Pair[]> {
  const { chainId } = Configs

  const bases: Token[] = chainId ? BASES_TO_CHECK_TRADES_AGAINST[chainId] : []

  const [tokenA, tokenB] = chainId
    ? [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]
    : [undefined, undefined]

  let basePairs: [Token, Token][] = []
  bases.map((base) => {
    bases.map((otherBase) => basePairs.push([base, otherBase]))
  })
  basePairs = basePairs.filter(([t0, t1]) => t0.address !== t1.address)

  const allPairCombinations: [Token, Token][] =
    tokenA && tokenB
      ? [
          // the direct pair
          [tokenA, tokenB],
          // token A against all bases
          ...bases.map((base): [Token, Token] => [tokenA, base]),
          // token B against all bases
          ...bases.map((base): [Token, Token] => [tokenB, base]),
          // each base against all bases
          ...basePairs,
        ]
          .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
          .filter(([t0, t1]) => t0.address !== t1.address)
          .filter(([tokenA, tokenB]) => {
            if (!chainId) return true
            const customBases = CUSTOM_BASES[chainId]
            if (!customBases) return true

            const customBasesA: Token[] | undefined = customBases[tokenA.address]
            const customBasesB: Token[] | undefined = customBases[tokenB.address]

            if (!customBasesA && !customBasesB) return true

            if (customBasesA && !customBasesA.find((base) => tokenB.equals(base))) return false
            if (customBasesB && !customBasesB.find((base) => tokenA.equals(base))) return false

            return true
          })
      : []

  const allPairs = await fetchPairs(allPairCombinations)

  // only pass along valid pairs, non-duplicated pairs
  return Object.values(
    allPairs
      // filter out invalid pairs
      .filter((result): result is [PairState.EXISTS, Pair] => Boolean(result[0] === PairState.EXISTS && result[1]))
      // filter out duplicated pairs
      .reduce<{ [pairAddress: string]: Pair }>((memo, [, curr]) => {
        memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
        return memo
      }, {}),
  )
}

const MAX_HOPS = 3

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
export async function useTradeExactIn(
  currencyAmountIn?: CurrencyAmount,
  currencyOut?: Currency,
): Promise<Trade | null> {
  const allowedPairs = await useAllCommonPairs(currencyAmountIn?.currency, currencyOut)

  const [singleHopOnly] = [false]

  if (currencyAmountIn && currencyOut && allowedPairs.length > 0) {
    if (singleHopOnly) {
      return (
        Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: 1, maxNumResults: 1 })[0] ?? null
      )
    }
    // search through trades with varying hops, find best trade out of them
    let bestTradeSoFar: Trade | null = null
    // console.log(allowedPairs)
    for (let i = 1; i <= MAX_HOPS; i++) {
      // console.log('Find best trade...')
      const currentTrade: Trade | null =
        Trade.bestTradeExactIn(allowedPairs, currencyAmountIn, currencyOut, { maxHops: i, maxNumResults: 1 })[0] ?? null
      // if current trade is best yet, save it
      if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
        // console.log('Found best trade...')
        bestTradeSoFar = currentTrade
      }
    }
    return bestTradeSoFar
  }

  return null
}

/**
 * Returns the best trade for the token in to the exact amount of token out
 */
export async function useTradeExactOut(
  currencyIn?: Currency,
  currencyAmountOut?: CurrencyAmount,
): Promise<Trade | null> {
  const allowedPairs = await useAllCommonPairs(currencyIn, currencyAmountOut?.currency)

  const [singleHopOnly] = [false]

  if (currencyIn && currencyAmountOut && allowedPairs.length > 0) {
    if (singleHopOnly) {
      return (
        Trade.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: 1, maxNumResults: 1 })[0] ??
        null
      )
    }
    // search through trades with varying hops, find best trade out of them
    let bestTradeSoFar: Trade | null = null
    for (let i = 1; i <= MAX_HOPS; i++) {
      const currentTrade =
        Trade.bestTradeExactOut(allowedPairs, currencyIn, currencyAmountOut, { maxHops: i, maxNumResults: 1 })[0] ??
        null
      if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
        bestTradeSoFar = currentTrade
      }
    }
    return bestTradeSoFar
  }
  return null
}

export function isTransactionUnsupported(currencyIn?: Currency, currencyOut?: Currency): boolean {
  const { chainId } = Configs
  const unsupportedToken: { [address: string]: Token } = UNSUPPORT_TOKENS[chainId]

  const tokenIn = wrappedCurrency(currencyIn, chainId)
  const tokenOut = wrappedCurrency(currencyOut, chainId)

  // if unsupported list loaded & either token on list, mark as unsupported
  if (unsupportedToken) {
    if (tokenIn && Object.keys(unsupportedToken).includes(tokenIn.address)) {
      return true
    }
    if (tokenOut && Object.keys(unsupportedToken).includes(tokenOut.address)) {
      return true
    }
  }

  return false
}

// returns whether tradeB is better than tradeA by at least a threshold percentage amount
export function isTradeBetter(
  tradeA: Trade | undefined | null,
  tradeB: Trade | undefined | null,
  minimumDelta: Percent = ZERO_PERCENT,
): boolean | undefined {
  if (tradeA && !tradeB) return false
  if (tradeB && !tradeA) return true
  if (!tradeA || !tradeB) return undefined

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !currencyEquals(tradeA.inputAmount.currency, tradeB.inputAmount.currency) ||
    !currencyEquals(tradeB.outputAmount.currency, tradeB.outputAmount.currency)
  ) {
    throw new Error('Trades are not comparable')
  }

  if (minimumDelta.equalTo(ZERO_PERCENT)) {
    return tradeA.executionPrice.lessThan(tradeB.executionPrice)
  } else {
    return tradeA.executionPrice.raw.multiply(minimumDelta.add(ONE_HUNDRED_PERCENT)).lessThan(tradeB.executionPrice)
  }
}
