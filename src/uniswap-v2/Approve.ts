import { BigNumber } from 'ethers'
import { MaxUint256 } from '@ethersproject/constants'
import { CurrencyAmount, ETHER, Token, TokenAmount } from '@uniswap/sdk'
import { getTokenContract, WALLET_ADDRESS } from 'src/Contract'

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

export async function getTokenAllowance(token: Token, spender: string) {
  const contract = getTokenContract(token?.address)
  try {
    const allowance = await contract.functions.allowance(WALLET_ADDRESS, spender)
    return new TokenAmount(token, allowance.toString())
  } catch {
    return undefined
  }
}

export async function getApproveState(amountToApprove: CurrencyAmount, spender: string) {
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined
  const currentAllowance = await getTokenAllowance(token, spender)

  // check the current approval status
  const approvalState = (() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency === ETHER) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? false
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  })()

  return approvalState
}

// add 10%
export function calculateGasMargin(value: BigNumber): BigNumber {
  return value.mul(BigNumber.from(10000).add(BigNumber.from(1000))).div(BigNumber.from(10000))
}

export async function approveToken(amountToApprove: CurrencyAmount, spender: string) {
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined
  const approvalState = await getApproveState(amountToApprove, spender)

  if (approvalState != ApprovalState.NOT_APPROVED) return

  const contract = getTokenContract(token?.address)

  let useExact = false
  const estimatedGas = await contract.estimateGas.approve(spender, MaxUint256).catch(() => {
    // general fallback for tokens who restrict approval amounts
    useExact = true
    return contract.estimateGas.approve(spender, amountToApprove.raw.toString())
  })

  const response = await contract
    .approve(spender, useExact ? amountToApprove.raw.toString() : MaxUint256, {
      gasLimit: calculateGasMargin(estimatedGas),
    })
    .catch((error) => {
      console.debug('Failed to approve token', error)
      return null
    })

  if (response && response.wait) await response.wait()

  return response
}
