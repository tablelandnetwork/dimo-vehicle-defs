export interface Deployment {
  address: string;
  tablelandHost:
    | "https://tableland.network"
    | "https://testnets.tableland.network"
    | "http://localhost:8080";
}

export interface Deployments {
  [key: string]: Deployment;
}

export const deployments: Deployments = {
  matic: {
    address: "",
    tablelandHost: "https://tableland.network",
  },
  maticmum: {
    address: "0x393AeE7D67998237FA5e31D07C415727997E2a97",
    tablelandHost: "https://testnets.tableland.network",
  },
  localhost: {
    address: "",
    tablelandHost: "http://localhost:8080",
  },
};
