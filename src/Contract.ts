import { isAddress } from './Utils'
import { Contract, ethers, BigNumber } from 'ethers'
import { Configs } from './Config'

const provider = ethers.getDefaultProvider(ethers.providers.getNetwork(Configs.chainId))
const wallet = new ethers.Wallet(Configs.privateKey, provider)

export const WALLET_ADDRESS = wallet.address
export const UNISWAPV2_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

export function getContract(address, ABI) {
  if (!address || !isAddress(address)) return null
  return new Contract(address, ABI, wallet)
}

export function getUniswapV2RouterContract() {
  const { abi: IUniswapV2Router02ABI } = require('../contracts/IUniswapV2Router02.json')
  return getContract(UNISWAPV2_ROUTER_ADDRESS, IUniswapV2Router02ABI)
}

export function getTokenContract(tokenAddress: string) {
  const { abi: IERC20ABI } = require('../contracts/IERC20.json')
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
