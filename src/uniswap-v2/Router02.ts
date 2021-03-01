import { MaxUint256 } from '@ethersproject/constants'
import { BigNumber } from 'ethers'
import { getContract, getTokenContract, WALLET_ADDRESS } from '../Contract'
import { UniswapV2ContractAddress } from './ContractAddress'

function getUniswapV2RouterContract() {
  const { abi: IUniswapV2Router02ABI } = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
  return getContract(UniswapV2ContractAddress.Router02, IUniswapV2Router02ABI)
}

export async function approve(deployedTokenAddress: string) {
  const contract = getTokenContract(deployedTokenAddress)

  const response = await contract.functions.approve(UniswapV2ContractAddress.Router02, MaxUint256).catch((error) => {
    const { code, reason, transactionHash } = error
    console.error('Failed to approve router02', { code, reason, transactionHash })
    return null
  })

  if (response && response.wait) await response.wait()

  return response
}

export async function addLiquidity(
  tokenA: string,
  tokenB: string,
  amountADesired: BigNumber,
  amountBDesired: BigNumber,
  amountAMin: BigNumber = BigNumber.from(1),
  amountBMin: BigNumber = BigNumber.from(1),
) {
  const contract = getUniswapV2RouterContract()

  const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20

  const response = await contract.functions
    .addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, WALLET_ADDRESS, DEADLINE, {
      gasLimit: BigNumber.from('6000000'),
    })
    .catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to add liquidity', { code, reason, transactionHash })
      return null
    })

  if (response && response.wait) {
    await response.wait().catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed wait to add liquidity', { code, reason, transactionHash })
      return null
    })
  }

  return response
}

export async function addLiquidityETH(
  deployedTokenAddress: string,
  amountTokenDesired: BigNumber,
  amountETHDesired: BigNumber,
  amountTokenMin: BigNumber = BigNumber.from(1),
  amountETHMin: BigNumber = BigNumber.from(1),
) {
  const contract = getUniswapV2RouterContract()

  const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20

  const response = await contract.functions
    .addLiquidityETH(deployedTokenAddress, amountTokenDesired, amountTokenMin, amountETHMin, WALLET_ADDRESS, DEADLINE, {
      gasLimit: BigNumber.from('6000000'),
      value: amountETHDesired,
    })
    .catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to add liquidity eth', { code, reason, transactionHash })
      return null
    })

  if (response && response.wait) {
    await response.wait().catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed wait to add liquidity eth', { code, reason, transactionHash })
      return null
    })
  }

  return response
}
