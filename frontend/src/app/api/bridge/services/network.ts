import { ethers } from "ethers";
import { NetworkConfig } from "../types";
import { addresses } from "@/constants/address";
import CLPD_ABI from "@/constants/CLPD-abi.json";
import BRIDGE_CLPD_ABI from "@/constants/bridge-clpd-abi.json";
import CLPD_ABI_SAPPHIRE from "@/constants/clpd-sapphire-abi.json";
import { baseSepolia, sapphireTestnet } from "viem/chains";

export class NetworkService {
  private static instance: NetworkService;
  private providers: Record<string, ethers.Provider> = {};

  private constructor() {}

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private static networkConfigs: Record<string, NetworkConfig> = {
    baseSepolia: {
      rpc: baseSepolia.rpcUrls.default.http[0],
      contractAddress: addresses.baseSepolia.CLPD.address,
      abi: BRIDGE_CLPD_ABI,
      minGasLimit: "0.0001",
      isEncrypted: false,
    },
    sapphireTestnet: {
      rpc: sapphireTestnet.rpcUrls.default.http[0],
      contractAddress: addresses.sapphireTestnet.CLPD.address,
      abi: CLPD_ABI_SAPPHIRE,
      minGasLimit: "0.001",
      isEncrypted: true,
    },
  };

  getConfig(network: string): NetworkConfig {
    return NetworkService.networkConfigs[network];
  }

  async getProvider(network: string): Promise<ethers.Provider> {
    if (!this.providers[network]) {
      const config = this.getConfig(network);
      this.providers[network] = new ethers.JsonRpcProvider(config.rpc);
    }
    return this.providers[network];
  }

  getContract(network: string): ethers.Contract {
    const config = this.getConfig(network);
    const provider = this.providers[network];
    if (!provider) {
      throw new Error(`Provider not initialized for network ${network}`);
    }
    return new ethers.Contract(config.contractAddress, config.abi, provider);
  }
}
