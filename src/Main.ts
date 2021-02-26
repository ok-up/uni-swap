import { AutoSwap } from './AutoSwap'

async function main() {
  const input = 'ETH'
  const ouput = '0x61B46E6fDEd0A8730B16B4F551A23A4AD64C9909'
  const tokenAmountPerSwapTurn = '0.0001'

  // const input = '0x61B46E6fDEd0A8730B16B4F551A23A4AD64C9909'
  // const ouput = 'ETH'
  // const tokenAmountPerSwapTurn = '0.014876765530554233'

  const inputPerOutputToSwap = 10000
  const autoSwap = await AutoSwap.init(input, ouput, tokenAmountPerSwapTurn, inputPerOutputToSwap)
  await autoSwap.swap()
}

main()
