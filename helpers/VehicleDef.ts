import { Row } from "./TableMerkleTree";

type CSVRow = {
  device_type_id: string;
  make: string;
  make_token_id: string;
  oem_platform_name: string;
  model: string;
  year: string;
  metadata: string;
  model_style: string;
  model_sub_style: string;
};

export class VehicleDef {
  deviceTypeId: string;
  make: string;
  makeTokenId: number;
  oemPlatformName: string;
  model: string;
  year: number;
  metadata: string;
  modelStyle: string;
  modelSubStyle: string;

  static fromCSVRow(row: CSVRow): VehicleDef {
    return new VehicleDef(
      row.device_type_id.trim(),
      row.make.trim(),
      row.make_token_id.length > 0 ? parseInt(row.make_token_id.trim()) : 0,
      row.oem_platform_name.trim(),
      row.model.trim(),
      row.year.length > 0 ? parseInt(row.year.trim()) : 0,
      row.metadata.trim(),
      row.model_style.trim(),
      row.model_sub_style.trim()
    );
  }

  static solidityTypes = [
    "string",
    "string",
    "uint256",
    "string",
    "string",
    "uint256",
    "string",
    "string",
    "string",
  ];

  constructor(
    deviceTypeId: string,
    make: string,
    makeTokenId: number,
    oemPlatformName: string,
    model: string,
    year: number,
    metadata: string,
    modelStyle: string,
    modelSubStyle: string
  ) {
    this.deviceTypeId = deviceTypeId;
    this.make = make;
    this.makeTokenId = makeTokenId;
    this.oemPlatformName = oemPlatformName;
    this.model = model;
    this.year = year;
    this.metadata = metadata;
    this.modelStyle = modelStyle;
    this.modelSubStyle = modelSubStyle;
  }

  toRow(): Row {
    const row: Row = [];
    Object.values(this).forEach((entry) => row.push(entry));
    return row;
  }
}
