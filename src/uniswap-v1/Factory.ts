import { MaxUint256, AddressZero } from '@ethersproject/constants'
import { BigNumber } from 'ethers'
import { Configs } from 'src/Config'
import { getContract } from 'src/Contract'
import { factoryABI } from './abi/FactoryABI'
import { tokenABI } from './abi/TokenABI'
import { UniswapV1FactoryAddress } from './FactoryAddress'

export async function createExchange(deployedTokenAddress: string) {
  // check existed exchange
  let tokenExchange = await getTokenExchange(deployedTokenAddress)
  if (AddressZero != tokenExchange) return tokenExchange

  // create exchange
  const contract = getContract(UniswapV1FactoryAddress[Configs.chainId], factoryABI)

  const response = await contract.functions
    .createExchange(deployedTokenAddress, {
      gasLimit: BigNumber.from('6000000'),
      gasPrice: BigNumber.from('10000000000'),
    })
    .catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to create exchange', { code, reason, transactionHash })
      return null
    })

  if (response && response.wait) {
    await response.wait().catch((error) => {
      const { code, reason, transactionHash } = error
      console.error('Failed to create exchange', { code, reason, transactionHash })
      return null
    })
  }

  tokenExchange = await getTokenExchange(deployedTokenAddress)

  return tokenExchange
}

export async function getTokenExchange(deployedTokenAddress: string) {
  const contract = getContract(UniswapV1FactoryAddress[Configs.chainId], factoryABI)

  const response = await contract.functions.getExchange(deployedTokenAddress).catch((error) => {
    const { code, reason, transactionHash } = error
    console.error('Failed to get token exchange', { code, reason, transactionHash })
    return null
  })

  if (response && response.wait) await response.wait()

  return response && (response.out || response[0])
}

export async function approveTokenExchange(deployedTokenAddress: string, tokenExchange: string) {
  const contract = getContract(deployedTokenAddress, tokenABI)

  const response = await contract.functions.approve(tokenExchange, MaxUint256).catch((error) => {
    const { code, reason, transactionHash } = error
    console.error('Failed to approve token exchange', { code, reason, transactionHash })
    return null
  })

  if (response && response.wait) await response.wait()

  return response
}
