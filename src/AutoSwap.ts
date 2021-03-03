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
      JSBI.BigInt(parseUnits(`${price}`, this.toToken.decimals)),
      JSBI.BigInt(parseUnits('1', this.toToken.decimals)),
    )
  }

  static async init(
    fromTokenAddressOrSymbol: string,
    toTokenAddressOrSymbol: string,
    tokenAmountPerSwapTurn: number | string,
    limitPriceOutputTokenPerOneInputTokenToSwap: number | string,
  ) {
    const fromToken = await getToken(fromTokenAddressOrSymbol, 'InputToken')
    const toToken = await getToken(toTokenAddressOrSymbol, 'OutputToken')
    if (!fromToken) throw new Error(`Token not found... ${fromTokenAddressOrSymbol}`)
    if (!toToken) throw new Error(`Token not found... ${toTokenAddressOrSymbol}`)
    return new AutoSwap(fromToken, toToken, tokenAmountPerSwapTurn, limitPriceOutputTokenPerOneInputTokenToSwap)
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
      from: `${trade.inputAmount.toExact()} ${trade.inputAmount.currency.symbol}`,
      toEstimated: `${trade.outputAmount.toSignificant(6)} ${trade.outputAmount.currency.symbol}`,
      slippagePercent: `${slippage.toSignificant(6)} %`,
      maximumAmountIn: `${input.toSignificant(6)}`,
      minimumAmountOut: `${output.toSignificant(6)}`,
      priceImpactWithoutFee: `${priceImpactWithoutFee.toSignificant(4)} %`,
      realizedLPFee: `${realizedLPFee.toSignificant(4)} ETH`,
      router: trade.route.path.map((val) => val.symbol).join(' > '),
      price: `${trade.executionPrice.toSignificant(6)} ${trade.outputAmount.currency.symbol} per ${
        trade.inputAmount.currency.symbol
      }`,
      nextMidPrice: `${trade.nextMidPrice.toSignificant(6)}`,
      slippage: slippage,
      _price: trade.executionPrice,
    }

    return swapInfo
  }

  static showSwapInfo(tracklog, swapInfo) {
    tracklog.push(`--------------------Info---------------------`)
    tracklog.push(`From ${swapInfo.from}`)
    tracklog.push(`To (estimated) ${swapInfo.toEstimated}`)
    tracklog.push(`Slippage percent ${swapInfo.slippagePercent}`)
    // tracklog.push(`MaximumAmountIn with slippage ${swapInfo.maximumAmountIn}`)
    // tracklog.push(`MinimumAmountOut with slippage ${swapInfo.minimumAmountOut}`)
    tracklog.push(``)
    tracklog.push(`Minimum received ${swapInfo.minimumAmountOut}`)
    tracklog.push(`Price Impact Without Fee ${swapInfo.priceImpactWithoutFee}`)
    tracklog.push(`Liquidity Provider Fee ${swapInfo.realizedLPFee}`)
    tracklog.push(`Router ${swapInfo.router}`)
    tracklog.push(``)
    // tracklog.push(`NextMidPrice ${swapInfo.nextMidPrice}`)
    tracklog.push(`Price ${swapInfo.price}`)
    tracklog.push(`---------------------------------------------`)
  }

  static showBalances(tracklog, balanceEther, balanceTokenIn, balanceTokenOut, fromToken, toToken, swapAmount) {
    tracklog.push(`++++++++++++++++++Balances+++++++++++++++++++`)
    tracklog.push(`Ether balance: ${balanceEther} ETH`)
    tracklog.push(`Input token balance: ${balanceTokenIn} ${fromToken}`)
    tracklog.push(`Output token balance: ${balanceTokenOut} ${toToken}`)
    tracklog.push(``)
    tracklog.push(`Swap amount ${swapAmount} ${fromToken}`)
    tracklog.push(`+++++++++++++++++++++++++++++++++++++++++++++`)
  }

  static showErrorNotEnoughtInput(tracklog) {
    tracklog.push(`********************Error********************`)
    tracklog.push(`Not enought input token to execute transaction`)
    tracklog.push(`*********************************************`)
  }

  static showErrorNotEnoughtETH(tracklog) {
    tracklog.push(`********************Error********************`)
    tracklog.push(`Not enought ether to execute transaction`)
    tracklog.push(`*********************************************`)
  }

  static showSwapOutput(tracklog, toEstimated, gasEstimate, minimumAmountOut, hash) {
    tracklog.push(`====================Swap=====================`)
    tracklog.push(`To (estimated) ${toEstimated}`)
    tracklog.push(`Gas (estimated) ${gasEstimate}`)
    tracklog.push(`Minimum received ${minimumAmountOut}`)
    tracklog.push(``)
    tracklog.push(`Detail transaction hash ${hash}`)
    tracklog.push(`=============================================`)
  }

  async swap(tracklog = []) {
    const trade = await useTradeExactIn(
      AutoSwap.getTokenAmount(this.fromToken, this.tokenAmountPerSwapTurn),
      this.toToken,
    )
    if (!trade) return false

    const swapInfo = AutoSwap.getSwapInfo(trade, Configs.slippagePercent)
    AutoSwap.showSwapInfo(tracklog, swapInfo)

    // console.log(swapInfo._price.raw.toSignificant(6))
    // console.log(swapInfo._price.raw.greaterThan(this.price))
    if (swapInfo._price.raw.greaterThan(this.price) || swapInfo._price.raw.equalTo(this.price)) {
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
        tracklog,
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
        AutoSwap.showErrorNotEnoughtInput(tracklog)
        return true
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
        AutoSwap.showErrorNotEnoughtETH(tracklog)
        return true
      }

      // execute swap
      const response = await contract.functions[methodName](...args, {
        gasLimit: gasEstimate,
        ...options,
        from: WALLET_ADDRESS,
      })

      // write log
      AutoSwap.showSwapOutput(
        tracklog,
        swapInfo.toEstimated,
        gasEstimate.toString(),
        swapInfo.minimumAmountOut,
        response.hash,
      )

      // wait transaction finish
      response && response.wait && (await response.wait())
    }
    return true
  }

  async log() {
    const tracklog = []
    const delta = Date.now() - this.prevTick
    this.prevTick = Date.now()
    tracklog.push(`# Call after ${delta} ms`)
    const beginAt = Date.now()
    const result = await this.swap(tracklog)
    const endAt = Date.now()
    tracklog.push(`# Time run ${endAt - beginAt} ms\n`)
    result && !Configs.isDisableLog && console.log(tracklog.join(`\n`))
  }

  start(scheduleRule: ScheduleRule) {
    this.schedule = NodeSchedule.scheduleJob(scheduleRule, this.log.bind(this))
  }

  stop() {
    this.schedule && this.schedule.cancel()
  }
}
