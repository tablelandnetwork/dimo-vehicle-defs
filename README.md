# dimo-vehicle-defs

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg)](https://github.com/RichardLitt/standard-readme)
[![Test](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/tablelandnetwork/dimo-vehicle-defs/actions/workflows/test.yml)

> Tableland-based DIMO Vehicle Definitions demo

# Table of Contents

- [Background](#background)
- [Development](#development)
- [License](#license)

# Background

This is demo of how one could host the DIMO Vehicle Definitions table from the DIMO VehicleId NFT contract using Tableland.

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
