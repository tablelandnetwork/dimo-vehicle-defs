import { run, network, deployment } from "hardhat";

async function main() {
  console.log(`\nVerifying on '${network.name}'...`);

  // Ensure deployments
  if (deployment.address === "") {
    throw Error(`no address entry for '${network.name}'`);
  }

  await run("verify:verify", {
    address: deployment.address,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
