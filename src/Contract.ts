import { getAddress } from 'ethers/lib/utils'
import { Contract, ethers, BigNumber } from 'ethers'
import { Configs } from './Config'

const provider = ethers.getDefaultProvider(ethers.providers.getNetwork(Configs.chainId))
const wallet = new ethers.Wallet(Configs.privateKey, provider)

export const WALLET_ADDRESS = wallet.address

export function isAddress(value: string) {
  try {
    return getAddress(value)
  } catch {
    return false
  }
}

export function getContract(address, ABI) {
  if (!address || !isAddress(address)) return null
  return new Contract(address, ABI, wallet)
}

export function getTokenContract(tokenAddress: string) {
  const { abi: IERC20ABI } = require('@uniswap/v2-periphery/build/IERC20.json')
  return getContract(tokenAddress, IERC20ABI)
}

export function getBalance() {
  return wallet.getBalance()
}

export async function getTokenBalance(tokenAddress: string): Promise<BigNumber> {
  const tokenContract = getTokenContract(tokenAddress)
  const balance = await tokenContract.functions.balanceOf(WALLET_ADDRESS)
  return (balance && balance[0]) || BigNumber.from(0)
}

export async function getContractBalance(contractAddress) {
  const balance = await provider.getBalance(contractAddress)
  return balance || BigNumber.from(0)
}
