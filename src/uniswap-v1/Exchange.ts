import { BigNumber, ethers } from 'ethers'
import { getContract } from 'src/Contract'
import { exchangeABI } from './abi/ExchangeABI'

export async function addLiquidity(
  tokenExchangeAddress: string,
  amountETH: string | number = 0.1,
  amountToken: string | number = 20,
) {
  const contract = getContract(tokenExchangeAddress, exchangeABI)

  const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20

  const ETH_ADDED = ethers.utils.parseEther(`${amountETH}`) // 1 * 10 ** 17 //0.1 ETH
  const TOKEN_ADDED = ethers.utils.parseUnits(`${amountToken}`, 18) // 15 * 10 ** 18 // 15  tokens

  const response = await contract.functions
    .addLiquidity(1, TOKEN_ADDED, DEADLINE, {
      gasLimit: BigNumber.from('6000000'),
      value: ETH_ADDED,
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

export async function removeLiquidity(tokenExchangeAddress: string, amountETH: BigNumber) {
  const contract = getContract(tokenExchangeAddress, exchangeABI)

  const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20

  const response = await contract.functions
    .removeLiquidity(amountETH, 1, 1, DEADLINE, {
      gasLimit: BigNumber.from('6000000'),
    })
    .catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to remove liquidity', { code, reason, transactionHash })
      return null
    })

  if (response && response.wait) {
    await response.wait().catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed wait to remove liquidity', { code, reason, transactionHash })
      return null
    })
  }

  return response
}

export async function removeAllLiquidity(tokenExchangeAddress: string) {
  const amountETH = await getTotalSupply(tokenExchangeAddress)
  console.log('Current total supply:', ethers.utils.formatEther(amountETH))
  const response = await removeLiquidity(tokenExchangeAddress, amountETH)
  return response
}

export async function getTotalSupply(tokenExchangeAddress: string) {
  const contract = getContract(tokenExchangeAddress, exchangeABI)

  const response = await contract.functions.totalSupply().catch((error) => {
    const { code, reason, transactionHash } = error
    console.error('Failed to get total supply', { code, reason, transactionHash })
    return BigNumber.from(0)
  })

  if (response && response.wait) {
    await response.wait().catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to get total supply', { code, reason, transactionHash })
      return BigNumber.from(0)
    })
  }

  return response && (response.out || response[0])
}
