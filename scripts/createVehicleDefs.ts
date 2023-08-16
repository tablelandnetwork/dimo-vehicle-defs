import * as path from "path";
import { ethers, network, deployment } from "hardhat";
import { VehicleDef } from "../helpers/VehicleDef";
import { loadCSV } from "../helpers/csv";

const batchSize = 50;

async function main() {
  console.log(`\nCreating vehicle defs on '${network.name}'...`);

  // Get owner account
  const [account] = await ethers.getSigners();
  if (account.provider === undefined) {
    throw Error("missing provider");
  }

  // Ensure deployments
  if (deployment.address === "") {
    throw Error(`no address entry for '${network.name}'`);
  }

  // Attach to contract
  const vehicles = (await ethers.getContractFactory("VehicleId")).attach(
    deployment.address
  );

  // Load data from CSV
  const data = await loadCSV(
    path.resolve(__dirname, "../test/testdata/device_definitions.csv"),
    [
      "device_type_id",
      "make",
      "make_token_id",
      "oem_platform_name",
      "model",
      "year",
      "metadata",
      "model_style",
      "model_sub_style",
    ],
    (row: any) => {
      return VehicleDef.fromCSVRow(row);
    },
    0,
    100000
  );

  // Create all vehicle defs
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const txn = await vehicles.createVehicleDefs(batch);
    const receipt = await txn.wait();
    console.log(
      `added '${batch.length}' vehicle defs with tx '${receipt.transactionHash}'`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
