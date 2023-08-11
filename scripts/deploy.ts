import { ethers, network, address, baseURI } from "hardhat";
import type { VehicleId } from "../typechain-types";

async function main() {
  console.log(`\nDeploying new contract to '${network.name}'...`);

  // Get owner account
  const [account] = await ethers.getSigners();
  if (account.provider === undefined) {
    throw Error("missing provider");
  }

  // Get base URI
  if (baseURI === undefined || baseURI === "") {
    throw Error(`missing baseURI entry for '${network.name}'`);
  }
  console.log(`Using base URI '${baseURI}'`);

  // Don't allow multiple deployments per network
  if (address !== undefined && address !== "") {
    throw Error(`already deployed to '${network.name}'`);
  }

  // Deploy contract
  const Factory = await ethers.getContractFactory("VehicleId");
  const vehicles = await (
    (await Factory.deploy(baseURI)) as VehicleId
  ).deployed();
  console.log("New contract address:", vehicles.address);

  // Warn that address needs to be saved in config
  console.log(
    `\nSave 'addresses.${network.name}: "${vehicles.address}"' in 'network.ts'!`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
