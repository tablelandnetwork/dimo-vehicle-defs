// Based on https://github.com/QuarkChain/DynamicMerkleTree/blob/abe6c7ee8f2fef105649943d5e329e5f5e697f8d/test/merklized-erc20-test.js

import { ethers } from "hardhat";

export type Row = (string | number | boolean)[];

export class MerkleTreeTable {
  readonly rows: string[];
  private solidityTypes: string[];

  constructor(solidityTypes: string[]) {
    this.rows = [];
    this.solidityTypes = solidityTypes;
  }

  // Mimicks the validator collecting a new row via EVM events
  append(row: Row) {
    this.rows.push(this.hashRow(row, this.rows.length + 1));
  }

  // Hash entire row including its row id
  private hashRow(row: Row, id: number): string {
    return ethers.utils.solidityKeccak256(
      ["uint256"].concat(this.solidityTypes),
      [id].concat(row as any)
    );
  }

  // Row index starts at 1 to mimick a table with auto-incrementing ids
  get(idx: number): string {
    return this.rows[idx - 1];
  }

  // Get the local table root
  root(): string {
    if (this.rows.length === 0) {
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }

    let hl = [...this.rows];

    while (hl.length > 1) {
      const nhl: string[] = [];
      for (let i = 0; i < hl.length; i += 2) {
        nhl.push(
          ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            [
              hl[i],
              i + 1 < hl.length
                ? hl[i + 1]
                : "0x0000000000000000000000000000000000000000000000000000000000000000",
            ]
          )
        );
      }
      hl = nhl;
    }

    return hl[0];
  }

  // Get proof needed to update on-chain merkle root
  getAppendProof(): string[] {
    return this.getInclusionProof(this.rows.length + 1);
  }

  // Get proof needed to verify the existence of a row in the on-chain merkle root
  getInclusionProof(idx: number): string[] {
    idx = idx - 1;
    let hl = [...this.rows];

    if (idx === hl.length) {
      // append
      hl.push(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    }
    const proof: string[] = [];

    while (hl.length > 1 || idx !== 0) {
      let nidx = Math.floor(idx / 2) * 2;
      if (nidx === idx) {
        nidx += 1;
      }

      if (nidx < hl.length) {
        proof.push(hl[nidx]);
      }

      const nhl: string[] = [];
      for (let i = 0; i < hl.length; i += 2) {
        nhl.push(
          ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            [
              hl[i],
              i + 1 < hl.length
                ? hl[i + 1]
                : "0x0000000000000000000000000000000000000000000000000000000000000000",
            ]
          )
        );
      }

      hl = nhl;
      idx = Math.floor(idx / 2);
    }

    return proof;
  }
}
