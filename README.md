# dimo-vehicle-defs

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg)](https://github.com/RichardLitt/standard-readme)
[![Test](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml)

> Tableland-based DIMO Vehicle Definitions demo

# Table of Contents

- [Background](#background)
- [Development](#development)
- [License](#license)

# Background

This is a demo of hosting the DIMO vehicle definitions table from the DIMO `VehicleId` ERC721 contract using Tableland. The table is owned by and written to by the `VehicleId` contract. `VehicleId` tokens represent user vehicles and are associated with a vehicle definition (e.g. 2011 Toyota Tacoma). The crux of the problem is how to ensure that a given vehicle definition exists when a new `VehicleId` is minted from the contract.

We show two potential solutions:

1. [`VehicleId`](./contracts/VehicleId.sol) simply increments a counter whenever a new vehicle definition is added. When minting a `VehicleId`, the user passes in an integer that represents the Tableland row ID (auto-incrementing primary key) of a vehicle definition. Since table rows cannot be deleted, if this integer is greater than the current counter, we know it’s invalid and the transaction is rejected.
2. [`VehicleId2`](./contracts/VehicleId2.sol) leverages a (somewhat experimental) on-chain [dynamic merkle tree](https://ethresear.ch/t/efficient-on-chain-dynamic-merkle-tree/11054) to track a root hash that represents the entire off-chain vehicle definitions table. When minting a `VehicleId`, the user passes in the Tableland row ID (auto-incrementing primary key) of a vehicle definition, a hash of its values (make, model, year, etc.), and a merkle inclusion proof that it actually exists in the off-chain table. The contract only needs to store a single `bytes32` representing the root hash. This approach is more heavy-handed, but ensures a tighter coupling between the `VehicleId` and vehicle definition.

   Note that the proofs needs to be generated off-chain from the table state. Ideally, validators [`go-tableland`](https://github.com/tablelandnetwork/go-tableland) should have an API endpoint that allows users and apps to fetch inclusion proofs for a given row by internally maintaining a merkle tree for the table. As a user, you wouldn't have to trust what the validator gives you because verification happens on-chain against a root hash that is dynamically updated when rows are added/updated (remember, in this case the table can only be written to by the contract).

## NFT Metadata

We also show how the ERC721 token metadata could be handled dynamically from the vehicle definitions table. The [tokenUri](./contracts/VehicleId.sol#L165) method returns a Tableland query that selects from the table using the internal VehicleId to vehicle definition mapping (see the query [here](./helpers/uris.ts#L19)). The result is that we get token metadata that can change based on its associated vehicle definition. Note, this is only implemented for [`VehicleId`](./contracts/VehicleId.sol).

Here's what the metadata for a `VehicleId` might look like.

```json
{
  "name": "VehicleId #1",
  "attributes": [
    {
      "trait_type": "device_type_id",
      "value": "vehicle"
    },
    {
      "trait_type": "make",
      "value": "Ford"
    },
    {
      "trait_type": "make_token_id",
      "value": 41,
      "display_type": "number"
    },
    {
      "trait_type": "oem_platform_name",
      "value": "FordPass"
    },
    {
      "trait_type": "model",
      "value": "F-250 Super Duty"
    },
    {
      "trait_type": "year",
      "value": 2018,
      "display_type": "number"
    },
    {
      "trait_type": "model_style",
      "value": "King Ranch 4dr Crew Cab SB (6.2L 8cyl 6A)"
    },
    {
      "trait_type": "model_sub_style",
      "value": "King Ranch"
    }
  ],
  "metadata": {
    "vehicle_info": {
      "base_msrp": "44600",
      "fuel_type": "Diesel",
      "wheelbase": "164 WB",
      "generation": "13",
      "driven_wheels": "4x4",
      "number_of_doors": "4",
      "manufacturer_code": "W2B",
      "fuel_tank_capacity_gal": "34"
    }
  }
}
```

There's a lot we could do with the metadata structure. We could `JOIN` from other tables, remove/add attributes, add an image/animation, etc. Note, because [most common metadata format](https://docs.opensea.io/docs/metadata-standards) doesn't support nested object traits in `attributes`, we just add the `metadata` column from the vehicle definitions table as a top level property.

# Development

## Building the client

You can build the Typescript client locally:

```shell
npm install
npm run build
```

## Testing

Run the test suite:

```shell
npm test
```

## Deploying

Deployments are handled on a per-network basis:

```shell
npx hardhat run scripts/deploy.ts --network polygon
```

## Extracting the ABI and Bytecode

You can grab the assets you need by compiling and then using some `jq` magic:

### ABI

```shell
cat artifacts/contracts/VehicleId.sol/VehicleId.json | jq '.abi' > abi.json
```

### Bytecode

```shell
cat artifacts/contracts/VehicleId.sol/VehicleId.json | jq -r '.bytecode' > bytecode.bin
```

### Generate the Go client!

You can use the above `abi.json` to build the Go client:

```shell
mkdir gobuild
abigen --abi ./abi.json --bin ./bytecode.bin --pkg contracts --out gobuild/VehicleId.go
```

## Etherscan verification

To perform Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Polygon:

```shell
npx hardhat run scripts/deploy.ts --network polygon
```

Then, add a `POLYSCAN_API_KEY` to your `.env` file and run the verify script:

```shell
npx hardhat run scripts/verify.ts --network polygon
```

## Speedier tests

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# License

[The Unlicense](LICENSE)
