import { ethers, network, deployment } from "hardhat";
import { VehicleDef } from "../helpers/VehicleDef";

const defId = 123;
const def = new VehicleDef(
  "vehicle",
  "Chevrolet",
  21,
  "OnStart",
  "Corvette",
  2020,
  '{""vehicle_info"": {""mpg"": ""19"", ""mpg_city"": ""15"", ""base_msrp"": ""70850"", ""fuel_type"": ""GASOLINE"", ""wheelbase"": ""107 WB"", ""generation"": ""8"", ""mpg_highway"": ""27"", ""driven_wheels"": ""RWD"", ""number_of_doors"": ""2"", ""manufacturer_code"": ""1YC07"", ""fuel_tank_capacity_gal"": ""18.5""}}',
  "Stingray 2dr Convertible w/3LT (6.2L 8cyl 8AM)",
  "Stingray"
);

async function main() {
  console.log(`\nUpdating vehicle def on '${network.name}'...`);

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

  // Create all vehicle defs
  const txn = await vehicles.updateVehicleDef(defId, def);
  const receipt = await txn.wait();
  console.log(
    `updated vehicle def '${defId}' with tx '${receipt.transactionHash}'`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
