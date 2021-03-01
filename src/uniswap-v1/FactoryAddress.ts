import { ChainId } from '@uniswap/sdk'

// Reference uniswap v1 contract ABI
// https://uniswap.org/docs/v1/frontend-integration/connect-to-uniswap

export const UniswapV1FactoryAddress = {
  // mainnet
  [ChainId.MAINNET]: '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95',

  // testnets
  [ChainId.ROPSTEN]: '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351',
  [ChainId.RINKEBY]: '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36',
  [ChainId.KOVAN]: '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30',
  [ChainId.GÖRLI]: '0x6Ce570d02D73d4c384b46135E87f8C592A8c86dA',
}
