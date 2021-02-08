import { JSBI, Trade, Router, Percent, SwapParameters } from '@uniswap/sdk'
import { getUniswapV2RouterContract, WALLET_ADDRESS } from './Contract'
import { Contract, BigNumber } from 'ethers'
import { Configs } from './Config'

interface SwapCall {
  contract: Contract
  parameters: SwapParameters
}

interface SuccessfulCall {
  call: SwapCall
  gasEstimate: BigNumber
  options: object
}

interface FailedCall {
  call: SwapCall
  error: Error
}

type EstimatedSwapCall = SuccessfulCall | FailedCall

export function getSwapCallArguments(
  trade: Trade | undefined, // trade to execute, required
  allowedSlippage: Percent,
) {
  const recipient = WALLET_ADDRESS
  const deadline = Math.floor(Date.now() / 1000) + 60 * Configs.deadlineMinutes
  const contract = getUniswapV2RouterContract()

  const swapMethods: SwapParameters[] = []

  swapMethods.push(
    Router.swapCallParameters(trade, {
      feeOnTransfer: false,
      allowedSlippage,
      recipient,
      deadline,
    }),
  )

  swapMethods.push(
    Router.swapCallParameters(trade, {
      feeOnTransfer: true,
      allowedSlippage,
      recipient,
      deadline: deadline,
    }),
  )

  return swapMethods.map((parameters) => ({ parameters, contract }))
}

export async function estimateGasTrade(
  trade: Trade | undefined, // trade to execute, required
  allowedSlippage: Percent = new Percent(JSBI.BigInt(5), JSBI.BigInt(1000)),
) {
  const swapCalls = getSwapCallArguments(trade, allowedSlippage)

  function isZero(hexNumberString: string) {
    return /^0x0*$/.test(hexNumberString)
  }

  const estimatedCalls: EstimatedSwapCall[] = await Promise.all(
    swapCalls.map((call) => {
      const {
        parameters: { methodName, args, value },
        contract,
      } = call
      const options = !value || isZero(value) ? {} : { value }

      return contract.estimateGas[methodName](...args, options)
        .then((gasEstimate) => {
          return {
            call,
            gasEstimate,
            options,
          }
        })
        .catch((gasError) => {
          console.debug('Gas estimate failed, trying eth_call to extract error')

          return contract.callStatic[methodName](...args, options)
            .then((result) => {
              console.debug('Unexpected successful call after failed estimate gas', result)
              return { call, error: new Error('Unexpected issue with estimating the gas. Please try again.') }
            })
            .catch((callError) => {
              console.debug('Call threw error', callError)
              let errorMessage: string
              switch (callError.reason) {
                case 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT':
                case 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT':
                  errorMessage =
                    'This transaction will not succeed either due to price movement or fee on transfer. Try increasing your slippage tolerance.'
                  break
                case 'TransferHelper: TRANSFER_FROM_FAILED':
                  errorMessage = 'User must approve uniswap before use'
                  break
                default:
                  errorMessage = `The transaction cannot succeed due to error: ${callError.reason}. This is probably an issue with one of the tokens you are swapping.`
              }
              return { call, error: new Error(errorMessage) }
            })
        })
    }),
  )

  // a successful estimation is a bignumber gas estimate and the next call is also a bignumber gas estimate
  const successfulEstimation = estimatedCalls.find(
    (el, ix, list): el is SuccessfulCall =>
      'gasEstimate' in el && (ix === list.length - 1 || 'gasEstimate' in list[ix + 1]),
  )

  if (!successfulEstimation) {
    const errorCalls = estimatedCalls.filter((call): call is FailedCall => 'error' in call)
    if (errorCalls.length > 0) throw errorCalls[errorCalls.length - 1].error
    throw new Error('Unexpected error. Please contact support: none of the calls threw an error')
  }

  return successfulEstimation
}

// export async function swapExactTokensForTokens(
//   amountIn: JSBI,
//   amountOutMin: JSBI,
//   path: string[],
//   to: string,
//   deadline: Number,
// ) {
//   // handle
//   to = WALLET_ADDRESS
//   console.log(amountIn.toString())
//   console.log(amountOutMin.toString())
//   console.log(path)
//   console.log(to)
//   console.log(deadline)
//   const contract = getUniswapV2RouterContract()
//   try {
//     const amounts = await contract.functions.swapExactTokensForTokens(
//       amountIn.toString(),
//       amountOutMin.toString(),
//       path,
//       to,
//       deadline,
//     )
//     console.log(amounts)
//   } catch (err) {
//     console.log(err)
//   }
// }
