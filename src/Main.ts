import { createExchange } from './uniswap-v1/Factory'
import { addLiquidity, removeAllLiquidity } from './uniswap-v1/Exchange'
import { ETHER, Token } from '@uniswap/sdk'
import { Configs } from './Config'
import { approveToken } from './uniswap-v2/Approve'
import { getTokenAmount } from './uniswap-v2/Utils'
import { Addliquidity } from './uniswap-v2/AddLiquidity'

// const deployedTokenAddress = '0x61b46e6fded0a8730b16b4f551a23a4ad64c9909'
const deployedTokenAddress = '0x150B921674ce34aA72bD37FDeE0897f6D69e108E'
// const deployedTokenAddress = '0x0986e16d2dA070F40584a311C19a359b03d8e30F'

async function mainUniswapV1() {
  const tokenExchange = await createExchange(deployedTokenAddress)
  console.log('Token exchange address:', tokenExchange)

  const tokenA = new Token(Configs.chainId, deployedTokenAddress, 18)
  await approveToken(getTokenAmount(tokenA, '1'), tokenExchange)

  const responseAdded = await addLiquidity(tokenExchange)
  console.log(responseAdded)

  // const responseRemoved = await removeAllLiquidity(tokenExchange)
  // console.log(responseRemoved)
}

async function mainUniswapV2() {
  const tokenA = new Token(Configs.chainId, deployedTokenAddress, 18)
  const tokenB = ETHER

  const response = await Addliquidity(tokenA, tokenB, '150', '0.001')
  console.log(response)
}

async function main() {
  await mainUniswapV2()
}

main()
