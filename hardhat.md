# Setting up project

## Install hardhat
```bash
$ npm install --save-dev hardhat
```

## Init hardhat config
```bash
$ npx hardhat
# Choise create an empty hardhat.config.js
```

## Configuring the network
### # Public test network
#### Available testnets: Ropsten, Rinkeby, Kovan, Goerli
```javascript
// hardhat.config.js
module.exports = {
  //...
  networks: {
    goerli: {
      url: process.env.HTTP_PROVIDER_URL,
      accounts: { mnemonic: process.env.NMEMORIC }
    }
  }
};
```
### # Local network
#### Hardhat comes with a local blockchain built-in, the <a href="https://hardhat.org/hardhat-network/">Hardhat Network</a>
#### Upon startup, Hardhat Network will create a set of unlocked accounts and give them Ether
```bash
$ npx hardhat node
# Hardhat Network will print out its address, http://127.0.0.1:8545, along with a list of available accounts and their private keys.
```

## Deploying a Smart Contract

#### We use ethers in our script, so we need to install it and the @nomiclabs/hardhat-ethers plugin.
```bash
$ npm install --save-dev @nomiclabs/hardhat-ethers ethers
```

#### We need to add in our configuration that we are using the @nomiclabs/hardhat-ethers plugin.
```javascript
// hardhat.config.js
require('@nomiclabs/hardhat-ethers');

module.exports = {
...
};
```

#### Using the run command, we can deploy the Box contract to the local network (Hardhat Network):
```bash
$ npx hardhat run --network localhost scripts/deploy.js
Deploying Box...
Box deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Interacting from the Console
```console
$ npx hardhat console --network localhost
> const Box = await ethers.getContractFactory("Box")
undefined
> const box = await Box.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3")
undefined
> accounts = await ethers.provider.listAccounts()
[ '0xEce6999C6c5BDA71d673090144b6d3bCD21d13d4',
  '0xC1310ade58A75E6d4fCb8238f9559188Ea3808f9',
...
> (await ethers.provider.getBalance(accounts[0])).toString()
'0'
```

#### Sending transactions
```console
> await box.store(42)
{ hash:
   '0xa61ed89d6bd21a6182df28e557c241a3dd5aa932d1689f9c5bf8c49039d2334a',
...
```

#### Querying state
```console
> (await box.retrieve()).toString()
'42'
```