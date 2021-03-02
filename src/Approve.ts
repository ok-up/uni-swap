import { MaxUint256 } from '@ethersproject/constants'
import { Token, TokenAmount, CurrencyAmount, ETHER } from '@uniswap/sdk'
import { getTokenContract, WALLET_ADDRESS, UNISWAPV2_ROUTER_ADDRESS } from './Contract'
import { BigNumber } from 'ethers'

export interface SerializableTransactionReceipt {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: number
}

export interface TransactionDetails {
  hash: string
  approval?: { tokenAddress: string; spender: string }
  summary?: string
  claim?: { recipient: string }
  receipt?: SerializableTransactionReceipt
  lastCheckedBlockNumber?: number
  addedTime: number
  confirmedTime?: number
  from: string
}

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

/**
 * Returns whether a transaction happened in the last day (86400 seconds * 1000 milliseconds / second)
 * @param tx to check for recency
 */
export function isTransactionRecent(tx: TransactionDetails): boolean {
  return new Date().getTime() - tx.addedTime < 86_400_000
}

// returns whether a token has a pending approval transaction
export async function hasPendingApproval(tokenAddress?: string, spender?: string) {
  const allTransactions: { [txHash: string]: TransactionDetails } = {}
  return (
    typeof tokenAddress === 'string' &&
    typeof spender === 'string' &&
    Object.keys(allTransactions).some((hash) => {
      const tx = allTransactions[hash]
      if (!tx) return false
      if (tx.receipt) {
        return false
      } else {
        const approval = tx.approval
        if (!approval) return false
        return approval.spender === spender && approval.tokenAddress === tokenAddress && isTransactionRecent(tx)
      }
    })
  )
}

export async function getTokenAllowance(token: Token) {
  const contract = getTokenContract(token?.address)
  try {
    const allowance = await contract.functions.allowance(WALLET_ADDRESS, UNISWAPV2_ROUTER_ADDRESS)
    return new TokenAmount(token, allowance.toString())
  } catch {
    return undefined
  }
}

export async function getApproveState(amountToApprove: CurrencyAmount, spender: string) {
  if (amountToApprove.currency === ETHER) return ApprovalState.APPROVED
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined
  const currentAllowance = await getTokenAllowance(token)

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
