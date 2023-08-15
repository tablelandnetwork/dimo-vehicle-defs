# dimo-vehicle-defs

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg)](https://github.com/RichardLitt/standard-readme)
[![Test](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml)

> Tableland-based DIMO Vehicle Definitions demo

# Table of Contents

- [Background](#background)
- [Development](#development)
- [License](#license)

# Background

This is a demo hosting the DIMO Vehicle Definitions table from the DIMO `VehicleId` ERC721 contract using Tableland. The table is owned by and written to by the `VehicleId` contract. `VehicleId` tokens represent user vehicles and are associated with a vehicle definition (e.g. 2011 Toyota Tacoma). The crux of the problem is how to ensure that a given vehicle definition exists when a new `VehicleId` is minted from the contract.

We show two potential solutions:

1. [`VehicleId`](./contracts/VehicleId.sol) simply increments a counter whenever a new vehicle definition is added. When minting a `VehicleId`, the user passes in an integer that represents the Tableland row ID (auto-incrementing primary key) of a vehicle definition. Since the table is append only, if this integer is greater than the current counter, we know it’s invalid and the transaction is rejected.
2. [`VehicleId2`](./contracts/VehicleId2.sol) leverages a (somewhat experimental) on-chain [dynamic merkle tree](https://ethresear.ch/t/efficient-on-chain-dynamic-merkle-tree/11054) to track a root hash that represents the entire off-chain vehicle definitions table. When minting a `VehicleId`, the user passes in the Tableland row ID (auto-incrementing primary key) of a vehicle definition, a hash of the actual vehicle definition values (make, model, year, etc.), and a merkle inclusion proof that the vehicle definition actually exists in the off-chain table. The contract only needs to store a single `bytes32` representing the root hash. This approach is more heavy-handed, but ensures a tighter coupling between the `VehicleId` and vehicle definition.

   The downside of this method is that the proof needs to be generated off-chain from the entire table state. Ideally, `go-tableland` should have an API endpoint that allows users and apps to fetch inclusion proofs for a given row.

   The advantage of this approach is that, if `go-tableland` could provide inclusion proofs, you would not have to trust it because verification happens on-chain against a root hash that is dynamically updated when new rows are added (remember, in this case the table can only be written to by the contract).

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
