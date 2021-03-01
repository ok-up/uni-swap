import { Currency, ETHER, JSBI, Token } from '@uniswap/sdk'
import { fetchPair, PairState } from './Pair'
import { getTokenAmount, wrappedCurrency, wrappedCurrencyAmount } from './Utils'
import { Configs } from '../Config'
import { parseUnits } from 'ethers/lib/utils'
import { addLiquidity, addLiquidityETH } from './Router02'
import { BigNumber } from 'ethers'
import { approveToken } from './Approve'
import { UniswapV2ContractAddress } from './ContractAddress'

async function recaculateAmountsIfPairExists(
  currencyA: Currency,
  currencyB: Currency,
  amountADesired?,
  amountBDesired?,
) {
  console.log('Recaculate amounts if pair exists...')
  const pair = await fetchPair(currencyA, currencyB)
  if (pair[0] === PairState.EXISTS) {
    const [tokenA, tokenB] = [wrappedCurrency(currencyA, Configs.chainId), wrappedCurrency(currencyB, Configs.chainId)]
    const dependentTokenAmountB = pair[1]
      .priceOf(tokenA)
      .quote(wrappedCurrencyAmount(getTokenAmount(tokenA, amountADesired), Configs.chainId))

    const dependentTokenAmountA = pair[1]
      .priceOf(tokenB)
      .quote(wrappedCurrencyAmount(getTokenAmount(tokenB, amountBDesired), Configs.chainId))

    if (
      dependentTokenAmountA
        .divide(JSBI.BigInt(parseUnits(amountADesired, tokenA.decimals)))
        .lessThan(dependentTokenAmountB.divide(JSBI.BigInt(parseUnits(amountBDesired, tokenB.decimals))))
    ) {
      amountADesired = dependentTokenAmountA.toExact()
    } else {
      amountBDesired = dependentTokenAmountB.toExact()
    }
  }
  return { amountADesired, amountBDesired }
}

export async function Addliquidity(
  currencyA: Currency | Token,
  currencyB: Currency | Token,
  amountADesired?: any,
  amountBDesired?: any,
  amountAMin: any = '1',
  amountBMin: any = '1',
) {
  if (currencyB === ETHER) {
    const currency = currencyB
    currencyB = currencyA
    currencyA = currency

    const amountDesired = amountBDesired
    amountBDesired = amountADesired
    amountADesired = amountDesired

    const amountMin = amountBMin
    amountBMin = amountAMin
    amountAMin = amountMin
  }

  const [tokenA, tokenB] = [wrappedCurrency(currencyA, Configs.chainId), wrappedCurrency(currencyB, Configs.chainId)]
  const amounts = await recaculateAmountsIfPairExists(currencyA, currencyB, amountADesired, amountBDesired)

  console.log('Amounts before recalculate:', { amountADesired, amountBDesired })
  console.log('Amounts after recalculate: ', amounts)

  amountADesired = BigNumber.from(parseUnits(amounts.amountADesired, tokenA.decimals))
  amountBDesired = BigNumber.from(parseUnits(amounts.amountBDesired, tokenB.decimals))

  amountAMin = BigNumber.from(parseUnits(amountAMin, tokenA.decimals))
  amountBMin = BigNumber.from(parseUnits(amountBMin, tokenB.decimals))

  if (currencyA === ETHER) {
    console.log('Waiting add liquidity ETH...')
    return await addLiquidityETH(tokenB.address, amountBDesired, amountADesired)
  } else {
    console.log('Waiting approve token...')
    await approveToken(getTokenAmount(tokenA, amounts.amountADesired), UniswapV2ContractAddress.Router02)
    console.log('Waiting add liquidity...')
    return await addLiquidity(tokenA.address, tokenB.address, amountADesired, amountBDesired, amountAMin, amountBMin)
  }
}
