import { AutoSwap } from './AutoSwap'

async function main() {
  const input = 'UNI'
  const ouput = 'WETH'
  const tokenAmountPerSwapTurn = 0.001
  const inputPerOutputToSwap = 10000
  const autoSwap = await AutoSwap.init(input, ouput, tokenAmountPerSwapTurn, inputPerOutputToSwap)
  await autoSwap.swap()
}

main()
