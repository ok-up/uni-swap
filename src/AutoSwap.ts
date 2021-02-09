import * as NodeSchedule from 'node-schedule'
import { Token, TokenAmount, JSBI, Trade } from '@uniswap/sdk'
import { getToken } from './Token'
import { useTradeExactIn } from './Trades'
import { parseUnits, formatUnits, formatEther } from 'ethers/lib/utils'
import { approveToken } from './Approve'
import { UNISWAPV2_ROUTER_ADDRESS, WALLET_ADDRESS, getBalance, getTokenBalance } from './Contract'
import { computeSlippageAdjustedAmounts, computeTradePriceBreakdown } from './Price'
import { estimateGasTrade } from './Swap'
import { Configs } from './Config'

type ScheduleRule =
  | NodeSchedule.RecurrenceRule
  | NodeSchedule.RecurrenceSpecDateRange
  | NodeSchedule.RecurrenceSpecObjLit
  | Date
  | string
  | number

export class AutoSwap {
  private schedule: NodeSchedule.Job

  private constructor(
    private readonly fromToken: Token,
    private readonly toToken: Token,
    private readonly tokenAmountPerSwapTurn: number,
    private readonly price: number,
  ) {}

  static async init(
    fromTokenAddressOrSymbol: string,
    toTokenAddressOrSymbol: string,
    tokenAmountPerSwapTurn: number,
    priceTokenInPerTokenOutToSwap: number,
  ) {
    const fromToken = await getToken(fromTokenAddressOrSymbol)
    const toToken = await getToken(toTokenAddressOrSymbol)
    if (!fromToken) throw new Error(`Token not found... ${fromTokenAddressOrSymbol}`)
    if (!toToken) throw new Error(`Token not found... ${toTokenAddressOrSymbol}`)
    return new AutoSwap(fromToken, toToken, tokenAmountPerSwapTurn, priceTokenInPerTokenOutToSwap)
  }

  static getTokenAmount(token: Token, amount: string | number) {
    amount = typeof amount !== 'string' ? `${amount}` : amount
    return new TokenAmount(token, JSBI.BigInt(parseUnits(amount, token.decimals)))
  }

  static getSwapInfo(trade: Trade, slippagePercent: number) {
    const { input, output, slippage } = computeSlippageAdjustedAmounts(trade, slippagePercent)
    const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(trade)

    const swapInfo = {
      from: trade.inputAmount.toExact(),
      toEstimated: trade.outputAmount.toSignificant(6),
      slippagePercent: slippage.toSignificant(6),
      maximumAmountIn: input.toSignificant(6),
      minimumAmountOut: output.toSignificant(6),
      priceImpactWithoutFee: priceImpactWithoutFee.toSignificant(4),
      realizedLPFee: realizedLPFee.toSignificant(4),
      router: trade.route.path.map((val) => val.symbol).join(' > '),
      price: trade.executionPrice.invert().toSignificant(6),
      nextMidPrice: trade.nextMidPrice.toSignificant(6),
      slippage: slippage,
    }

    return swapInfo
  }

  static showSwapInfo(swapInfo) {
    console.log('---------------------------------------------')
    console.log('From', swapInfo.from)
    console.log('To (estimated)', swapInfo.toEstimated)
    console.log('Slippage percent', swapInfo.slippagePercent)
    // console.log('MaximumAmountIn with slippage', swapInfo.maximumAmountIn)
    // console.log('MinimumAmountOut with slippage', swapInfo.minimumAmountOut)
    console.log()
    console.log('Minimum received', swapInfo.minimumAmountOut)
    console.log('Price Impact Without Fee', swapInfo.priceImpactWithoutFee)
    console.log('Liquidity Provider Fee', swapInfo.realizedLPFee)
    console.log('Router', swapInfo.router)
    console.log()
    // console.log('NextMidPrice', swapInfo.nextMidPrice)
    console.log('Price', swapInfo.price)
    console.log('---------------------------------------------')
  }

  async swap() {
    const trade = await useTradeExactIn(
      AutoSwap.getTokenAmount(this.fromToken, this.tokenAmountPerSwapTurn),
      this.toToken,
    )
    const swapInfo = AutoSwap.getSwapInfo(trade, Configs.slippagePercent)
    AutoSwap.showSwapInfo(swapInfo)

    if (+swapInfo.price < this.price) {
      const balanceEther = formatEther(await getBalance())
      const balanceTokenIn = formatUnits(await getTokenBalance(this.fromToken.address), this.fromToken.decimals)
      const balanceTokenOut = formatUnits(await getTokenBalance(this.toToken.address), this.toToken.decimals)

      console.log('Ether balance:', balanceEther, 'ETH')
      console.log('Input token balance:', balanceTokenIn, this.fromToken.symbol)
      console.log('Output token balance:', balanceTokenOut, this.toToken.symbol)
      console.log()
      console.log('Swap amount', swapInfo.from, this.fromToken.symbol)

      // allow token to execute transaction
      await approveToken(trade.inputAmount, UNISWAPV2_ROUTER_ADDRESS)

      if (+trade.inputAmount.toExact() > +balanceTokenIn) {
        console.warn('*********************************************')
        console.warn('Not enought input token to execute transaction')
        console.warn('*********************************************')
        return
      }

      // estimate gas
      const {
        call: {
          contract,
          parameters: { methodName, args },
        },
        gasEstimate,
        options,
      } = await estimateGasTrade(trade, swapInfo.slippage)

      if (+balanceEther < +formatEther(gasEstimate)) {
        console.warn('*********************************************')
        console.warn('Not enought ether to execute transaction')
        console.warn('*********************************************')
        return
      }

      // execute swap
      const response = await contract.functions[methodName](...args, {
        gasLimit: gasEstimate,
        ...options,
        from: WALLET_ADDRESS,
      })

      // write log
      console.log('=============================================')
      console.log('To (estimated)', swapInfo.toEstimated)
      console.log('Gas (estimated)', gasEstimate.toString())
      console.log('Minimum received', swapInfo.minimumAmountOut)
      console.log()
      console.log('Detail transaction hash', response.hash)
      console.log('=============================================')
      console.log()

      // wait transaction finish
      response && response.wait && (await response.wait())
    }
  }

  start(scheduleRule: ScheduleRule) {
    this.schedule = NodeSchedule.scheduleJob(scheduleRule, this.swap.bind(this))
  }

  stop() {
    this.schedule && this.schedule.cancel()
  }
}
