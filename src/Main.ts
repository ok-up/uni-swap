import path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
import { AutoSwap } from './AutoSwap'
import { Configs } from './Config'

async function main() {
  const {
    inputToken,
    outputToken,
    amountInputTokenPerSwapTurn,
    priceInputPerOutputToSwap,
    frequencySwappingPerSecond,
  } = Configs
  const autoSwap = await AutoSwap.init(inputToken, outputToken, amountInputTokenPerSwapTurn, priceInputPerOutputToSwap)

  let sec = Math.floor(60 / frequencySwappingPerSecond)
  sec = sec > 0 ? sec : 1
  await autoSwap.start(`*/${sec} * * * * *`)
}

main()
