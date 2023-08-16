import * as path from "path";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Database, Validator } from "@tableland/sdk";
import { LocalTableland, getAccounts, getDatabase } from "@tableland/local";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { VehicleId2 } from "../typechain-types";
import { MerkleTreeTable } from "../helpers/TableMerkleTree";
import { VehicleDef } from "../helpers/VehicleDef";
import { loadCSV } from "../helpers/csv";

const lt = new LocalTableland({
  silent: true,
});

before(async function () {
  lt.start();
  await lt.isReady();
});

after(async function () {
  await lt.shutdown();
});

const accounts = getAccounts();

describe("VehicleId2", function () {
  let db: Database;
  let validator: Validator;

  let data: VehicleDef[];
  let table: MerkleTreeTable;

  let vehicles: VehicleId2;
  let defsTableName: string;

  async function deployFixture() {
    // Init database
    db = getDatabase(accounts[0]);
    validator = new Validator(db.config);

    // Deploy contract
    const VehicleIdFactory = await ethers.getContractFactory("VehicleId2");
    vehicles = await (
      (await VehicleIdFactory.deploy("")) as VehicleId2
    ).deployed();

    defsTableName = await vehicles.getVehicleDefsTable();
  }

  async function loadData() {
    // Setup sample data
    data = await loadCSV(
      path.resolve(__dirname, "./testdata/device_definitions.csv"),
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
      23,
      10
    );

    // Setup merklized table
    // Will we add rows to this table as if it were the validator receiving rows via EVM events
    table = new MerkleTreeTable(VehicleDef.solidityTypes);
  }

  describe("createVehicleDef", () => {
    before(async function () {
      await loadFixture(deployFixture);
      await loadData();
    });

    it("Default admin (owner) should be able to create vehicle def", async () => {
      const [admin] = accounts;
      const [vehicle] = data;

      const txn = await vehicles
        .connect(admin)
        .createVehicleDef(vehicle, table.getAppendProof());
      const receipt = await txn.wait();
      const event = receipt.events?.find(
        (v) => v.event === "VehicleDefCreated"
      );

      // Manually add row to merklized table that would normally be hosted by a validator
      table.append(vehicle.toRow());

      // On-chain created id should match
      expect(event?.args?.id.toString()).to.equal(table.get(1));

      await validator.pollForReceiptByTransactionHash({
        chainId: 31337,
        transactionHash: receipt.transactionHash,
      });

      // Check if validator correctly picked up the new row
      const vdef = await db
        .prepare(
          `SELECT id, device_type_id, make, make_token_id, oem_platform_name, model, year, metadata, model_style, model_sub_style FROM ${defsTableName} WHERE id = 1`
        )
        .first<{
          id: number;
          device_type_id: string;
          make: string;
          make_token_id: number;
          oem_platform_name: string;
          model: string;
          year: number;
          metadata: string;
          model_style: string;
          model_sub_style: string;
        }>();

      expect(vdef).to.deep.include({
        id: 1,
        device_type_id: "vehicle",
        make: "Acura",
        make_token_id: 3,
        oem_platform_name: "ACURALINK",
        model: "ILX",
        year: 2013,
        metadata: {
          vehicle_info: {
            mpg: "27",
            mpg_city: "24",
            base_msrp: "31400",
            fuel_type: "Gasoline",
            wheelbase: "105 WB",
            generation: "1",
            mpg_highway: "34",
            driven_wheels: "FWD",
            number_of_doors: "4",
            manufacturer_code: "DE1F7DKNW",
            fuel_tank_capacity_gal: "13.2",
          },
        },
        model_style: "4dr Sedan (2.0L 4cyl 5A)",
        model_sub_style: "Base",
      });
    });

    it("Regular user should not be able to create vehicle def", async () => {
      const [, user] = accounts;
      const [, vehicle] = data;

      await expect(
        vehicles.connect(user).createVehicleDef(vehicle, table.getAppendProof())
      ).to.be.rejected;
    });

    it("Vehicle admin should be able to create vehicle def", async () => {
      const [owner, , , vehicleAdmin] = accounts;
      const [, vehicle] = data;

      await expect(
        vehicles
          .connect(vehicleAdmin)
          .createVehicleDef(vehicle, table.getAppendProof())
      ).to.be.rejected;

      await vehicles
        .connect(owner)
        .grantRole(vehicles.VEHICLE_ADMIN_ROLE(), vehicleAdmin.address);

      await expect(
        vehicles
          .connect(vehicleAdmin)
          .createVehicleDef(vehicle, table.getAppendProof())
      ).not.to.be.rejected;

      // Manually add row to merklized table that would normally be hosted by a validator
      table.append(vehicle.toRow());
    });
  });

  describe("createVehicleId", () => {
    before(async function () {
      await loadFixture(deployFixture);
      await loadData();
    });

    it("Regular user should be able to create vehicle id", async () => {
      const [admin, user] = accounts;

      // Create all vehicle defs
      for (let i = 0; i < data.length; i++) {
        const txn = await vehicles
          .connect(admin)
          .createVehicleDef(data[i], table.getAppendProof());
        const receipt = await txn.wait();
        const event = receipt.events?.find(
          (v) => v.event === "VehicleDefCreated"
        );

        // Manually add row to merklized table that would normally be hosted by a validator
        table.append(data[i].toRow());

        // On-chain created id should match
        expect(event?.args?.id.toString()).to.equal(table.get(i + 1));
      }

      const rowId = 4;
      const txn = await vehicles
        .connect(user)
        .createVehicleId(
          rowId,
          table.get(rowId),
          table.getInclusionProof(rowId)
        );
      const receipt = await txn.wait();
      const event = receipt.events?.find((v) => v.event === "VehicleIdCreated");
      expect(event?.args?.id.toString()).to.equal(BigNumber.from(1));
      expect(event?.args?.defId.toString()).to.equal(table.get(rowId));
      expect(await vehicles.getVehicleDefId(1)).to.equal(table.get(rowId));
    });

    it("Regular user should not be able to create vehicle id with a nonexistent vehicle def", async () => {
      const [, user] = accounts;

      // Get some more vehicle defs that were not added on-chain
      const badData = await loadCSV(
        path.resolve(__dirname, "./testdata/device_definitions.csv"),
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
        3
      );

      // Create invalid table
      const badTable = new MerkleTreeTable(VehicleDef.solidityTypes);
      for (let i = 0; i < badData.length; i++) {
        badTable.append(badData[i].toRow());
      }

      // Try to create vehicle def with an entry and proof from the bad table
      const rowId = 2;
      await expect(
        vehicles
          .connect(user)
          .createVehicleId(
            rowId,
            badTable.get(rowId),
            badTable.getInclusionProof(rowId)
          )
      ).to.be.rejected;
    });
  });
});
