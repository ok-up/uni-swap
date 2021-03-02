# uni-swap
## Install dependences
```bash
$ npm i
```
## Run app without build
```bash
$ npm start
```
## Build app
```bash
$ npm run build
```
## Run code built
```bash
$ npm run release
```
## Edit config
#### `file` config.json

## Main function
#### `file` src/Main.ts
<br/>

# Configuration Guide
|variables|description|
|---|---|
|chainId|blockchain network, values: MAINNET = 1, ROPSTEN = 3, RINKEBY = 4, GÖRLI = 5, KOVAN = 42|
|privateKey|private key of wallet|
|deadlineMinutes|deadline to execute swap|
|slippagePercent|swap slippage percent x.xx%|
|inputToken|input token to swap (default ETH), should be a token address|
|outputToken|output token want to swap, should be a token address|
|amountInputTokenPerSwapTurn|amount input token per swap turn|
|priceInputPerOutputToSwap|price inputToken/outputToken to swap|
|frequencySwappingPerSecond|frequency swapping per second|
<br/>

# Quick start
## Step 1 - Install dependences
```
$ npm i
```

## Step 2 - Edit config
#### Edit the variables in the config.json file:
* chainId
* privateKey
* inputToken
* outputToken
* amountInputTokenPerSwapTurn
* priceInputPerOutputToSwap

## Step 3 - Run program
```
$ npm start
```