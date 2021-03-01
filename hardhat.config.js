const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('@nomiclabs/hardhat-ethers');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.5.3",
  networks: {
    goerli: {
      url: process.env.HTTP_PROVIDER_URL,
      accounts: { mnemonic: process.env.NMEMORIC }
    }
  }
};
