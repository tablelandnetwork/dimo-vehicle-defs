import { run, network, address, baseURI } from "hardhat";

async function main() {
  console.log(`\nVerifying on '${network.name}'...`);

  // Ensure deployments
  if (address === undefined || address === "") {
    throw Error(`no address entry for '${network.name}'`);
  }

  await run("verify:verify", {
    address,
    constructorArguments: [baseURI],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
