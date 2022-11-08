const { upgrades, ethers } = require("hardhat");


async function main() {
  
  const Contract = await ethers.getContractFactory("Proxy");
  const contract = await upgrades.deployProxy(Contract);

  await contract.deployed();

  console.log("deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
<<<<<<< HEAD
  });
=======
  });
>>>>>>> fefebeed46834dd8a5c16b21cbe32f5e96ede9eb
