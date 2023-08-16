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
    address: "0x384516acd72c330cf49a158177098d8376dFBC82",
    tablelandHost: "https://testnets.tableland.network",
  },
  localhost: {
    address: "",
    tablelandHost: "http://localhost:8080",
  },
};
