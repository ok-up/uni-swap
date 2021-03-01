async function main() {
  // We get the contract to deploy
  const OceanToken = await ethers.getContractFactory("OceanToken");
  console.log("Deploying OceanToken...");
  const oceanToken = await OceanToken.deploy();
  await oceanToken.deployed();
  console.log("OceanToken deployed to:", oceanToken.address);
  return oceanToken.address;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });