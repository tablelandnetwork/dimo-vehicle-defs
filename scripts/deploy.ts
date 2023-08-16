import { ethers, network, deployment } from "hardhat";
import type { VehicleId } from "../typechain-types";
import { getURITemplate } from "../helpers/uris";

async function main() {
  console.log(`\nDeploying new contract to '${network.name}'...`);

  // Get owner account
  const [account] = await ethers.getSigners();
  if (account.provider === undefined) {
    throw Error("missing provider");
  }

  // Don't allow multiple deployments per network
  if (deployment.address !== "") {
    throw Error(`already deployed to '${network.name}'`);
  }

  // Deploy contract
  const Factory = await ethers.getContractFactory("VehicleId");
  const vehicles = await ((await Factory.deploy()) as VehicleId).deployed();
  console.log("New contract address:", vehicles.address);

  // Set URI Template
  await vehicles.setURITemplate(
    await getURITemplate(
      deployment.tablelandHost,
      await vehicles.getVehicleDefsTable()
    )
  );

  // Warn that address needs to be saved in config
  console.log(
    `\nSave 'deployment.${network.name}.address: "${vehicles.address}"' in 'deployments.ts'!`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
