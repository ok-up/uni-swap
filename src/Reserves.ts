import { Token, Pair } from '@uniswap/sdk'
import { getContract } from './Contract'

export async function getReserves(tokenA: Token, tokenB: Token) {
  const { abi: IUniswapV2PairABI } = require('../contracts/IUniswapV2Pair.json')
  const pairAddress = Pair.getAddress(tokenA, tokenB)
  const contract = getContract(pairAddress, IUniswapV2PairABI)
  const reserves = await contract.functions.getReserves()
  return reserves
}
