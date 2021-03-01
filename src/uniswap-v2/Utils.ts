import { ChainId, Currency, CurrencyAmount, ETHER, JSBI, Token, TokenAmount, WETH } from '@uniswap/sdk'
import { parseUnits } from 'ethers/lib/utils'

export function wrappedCurrency(currency: Currency | undefined, chainId: ChainId | undefined): Token | undefined {
  return chainId && currency === ETHER ? WETH[chainId] : currency instanceof Token ? currency : undefined
}

export function wrappedCurrencyAmount(
  currencyAmount: CurrencyAmount | undefined,
  chainId: ChainId | undefined,
): TokenAmount | undefined {
  const token = currencyAmount && chainId ? wrappedCurrency(currencyAmount.currency, chainId) : undefined
  return token && currencyAmount ? new TokenAmount(token, currencyAmount.raw) : undefined
}

export function getTokenAmount(token: Token | Currency, amount: string | Number = 1) {
  amount = typeof amount !== 'string' ? `${amount}` : amount
  return token instanceof Token
    ? new TokenAmount(token, JSBI.BigInt(parseUnits(amount, token.decimals)))
    : CurrencyAmount.ether(JSBI.BigInt(parseUnits(amount, token.decimals)))
}
