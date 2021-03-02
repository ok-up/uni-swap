import * as NodeSchedule from 'node-schedule'
import { Token, TokenAmount, JSBI, Trade, Currency, CurrencyAmount, Fraction } from '@uniswap/sdk'
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
  private readonly price: Fraction
  private prevTick = Date.now()

  private constructor(
    private readonly fromToken: Currency,
    private readonly toToken: Currency,
    private readonly tokenAmountPerSwapTurn: number | string,
    price: number | string,
  ) {
    this.price = new Fraction(
      JSBI.BigInt(parseUnits(`${price}`, this.fromToken.decimals)),
      JSBI.BigInt(parseUnits('1', this.fromToken.decimals)),
    )
  }

  static async init(
    fromTokenAddressOrSymbol: string,
    toTokenAddressOrSymbol: string,
    tokenAmountPerSwapTurn: number | string,
    priceTokenInPerTokenOutToSwap: number | string,
  ) {
    const fromToken = await getToken(fromTokenAddressOrSymbol)
    const toToken = await getToken(toTokenAddressOrSymbol)
    if (!fromToken) throw new Error(`Token not found... ${fromTokenAddressOrSymbol}`)
    if (!toToken) throw new Error(`Token not found... ${toTokenAddressOrSymbol}`)
    return new AutoSwap(fromToken, toToken, tokenAmountPerSwapTurn, priceTokenInPerTokenOutToSwap)
  }

  static getTokenAmount(token: Token | Currency, amount: string | number) {
    amount = typeof amount !== 'string' ? `${amount}` : amount
    return token instanceof Token
      ? new TokenAmount(token, JSBI.BigInt(parseUnits(amount, token.decimals)))
      : CurrencyAmount.ether(JSBI.BigInt(parseUnits(amount, token.decimals)))
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
      _price: trade.executionPrice.invert(),
    }

    return swapInfo
  }

  static showSwapInfo(swapInfo) {
    if (Configs.isDisableLog) return
    console.log('--------------------Info---------------------')
    console.log('From', swapInfo.from)
    console.log('To (estimated)', swapInfo.toEstimated)
    console.log('Slippage percent', swapInfo.slippagePercent)
    // console.log('MaximumAmountIn with slippage', swapInfo.maximumAmountIn)
    // console.log('MinimumAmountOut with slippage', swapInfo.minimumAmountOut)
    console.log()
    console.log('Minimum received', swapInfo.minimumAmountOut)
    console.log('Price Impact Without Fee', `${swapInfo.priceImpactWithoutFee}%`)
    console.log('Liquidity Provider Fee', swapInfo.realizedLPFee)
    console.log('Router', swapInfo.router)
    console.log()
    // console.log('NextMidPrice', swapInfo.nextMidPrice)
    console.log('Price', swapInfo.price)
    console.log('---------------------------------------------')
  }

  static showBalances(balanceEther, balanceTokenIn, balanceTokenOut, fromToken, toToken, swapAmount) {
    if (Configs.isDisableLog) return
    console.log('++++++++++++++++++Balances+++++++++++++++++++')
    console.log('Ether balance:', balanceEther, 'ETH')
    console.log('Input token balance:', balanceTokenIn, fromToken)
    console.log('Output token balance:', balanceTokenOut, toToken)
    console.log()
    console.log('Swap amount', swapAmount, fromToken)
    console.log('+++++++++++++++++++++++++++++++++++++++++++++')
  }

  static showErrorNotEnoughtInput() {
    console.warn('********************Error********************')
    console.warn('Not enought input token to execute transaction')
    console.warn('*********************************************')
  }

  static showErrorNotEnoughtETH() {
    console.warn('********************Error********************')
    console.warn('Not enought ether to execute transaction')
    console.warn('*********************************************')
  }

  static showSwapOutput(toEstimated, gasEstimate, minimumAmountOut, hash) {
    console.log('====================Swap=====================')
    console.log('To (estimated)', toEstimated)
    console.log('Gas (estimated)', gasEstimate)
    console.log('Minimum received', minimumAmountOut)
    console.log()
    console.log('Detail transaction hash', hash)
    console.log('=============================================')
  }

  async swap() {
    const trade = await useTradeExactIn(
      AutoSwap.getTokenAmount(this.fromToken, this.tokenAmountPerSwapTurn),
      this.toToken,
    )
    if (!trade) return

    const swapInfo = AutoSwap.getSwapInfo(trade, Configs.slippagePercent)
    AutoSwap.showSwapInfo(swapInfo)

    // console.log(swapInfo._price.raw.lessThan(this.price))
    if (swapInfo._price.raw.lessThan(this.price)) {
      const balanceEther = formatEther(await getBalance())
      const balanceTokenIn =
        this.fromToken instanceof Token
          ? formatUnits(await getTokenBalance(this.fromToken.address), this.fromToken.decimals)
          : balanceEther
      const balanceTokenOut =
        this.toToken instanceof Token
          ? formatUnits(await getTokenBalance(this.toToken.address), this.toToken.decimals)
          : balanceEther

      AutoSwap.showBalances(
        balanceEther,
        balanceTokenIn,
        balanceTokenOut,
        this.fromToken.symbol,
        this.toToken.symbol,
        swapInfo.from,
      )

      // allow token to execute transaction
      await approveToken(trade.inputAmount, UNISWAPV2_ROUTER_ADDRESS)

      if (+trade.inputAmount.toExact() > +balanceTokenIn) {
        AutoSwap.showErrorNotEnoughtInput()
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
        AutoSwap.showErrorNotEnoughtETH()
        return
      }

      // execute swap
      const response = await contract.functions[methodName](...args, {
        gasLimit: gasEstimate,
        ...options,
        from: WALLET_ADDRESS,
      })

      // write log
      AutoSwap.showSwapOutput(swapInfo.toEstimated, gasEstimate.toString(), swapInfo.minimumAmountOut, response.hash)

      // wait transaction finish
      response && response.wait && (await response.wait())
    }
  }

  async log() {
    const delta = Date.now() - this.prevTick
    this.prevTick = Date.now()
    // !Configs.isDisableLog && console.log('Call after:', delta, 'ms')
    const beginAt = Date.now()
    await this.swap()
    const endAt = Date.now()
    // !Configs.isDisableLog && console.log('Time run:', endAt - beginAt, 'ms')
    !Configs.isDisableLog && console.log()
  }

  start(scheduleRule: ScheduleRule) {
    this.schedule = NodeSchedule.scheduleJob(scheduleRule, this.log.bind(this))
  }

  stop() {
    this.schedule && this.schedule.cancel()
  }
}
