export interface TablelandNetworkConfig {
  matic: string;
  maticmum: string;
  // local tableland
  localhost: string; // hardhat
  "local-tableland": string; // hardhat backed by a local validator
}

export const addresses: TablelandNetworkConfig = {
  matic: "",
  maticmum: "",
  // localhost is a stand alone node
  localhost: "",
  // local-tableland implies that a validator is also running. the proxy address will always be
  // "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" because of the order of contract deployment
  "local-tableland": "",
};

const localTablelandURI = "http://localhost:8080/api/v1/tables/31337/";
export const baseURIs: TablelandNetworkConfig = {
  matic: "",
  maticmum: "",
  localhost: localTablelandURI,
  "local-tableland": localTablelandURI,
};
