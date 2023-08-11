import { ethers, network, baseURI, address } from "hardhat";

async function main() {
  console.log(`\nUpdating base URI on '${network.name}'...`);

  // Get owner account
  const [account] = await ethers.getSigners();
  if (account.provider === undefined) {
    throw Error("missing provider");
  }

  // Get address
  if (address === undefined || address === "") {
    throw Error(`missing address entry for '${network.name}'`);
  }
  console.log(`Using address '${address}'`);

  // Get new base URI
  if (baseURI === undefined || baseURI === "") {
    throw Error(`missing baseURI entry for '${network.name}'`);
  }
  console.log(`Using base URI '${baseURI}'`);

  // Update base URI
  const vehicles = (await ethers.getContractFactory("VehicleId")).attach(
    address
  );
  const tx = await vehicles.setBaseURI(baseURI);
  const receipt = await tx.wait();
  console.log(`base URI set with tx '${receipt.transactionHash}'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
