import { ethers } from "ethers";
import { NetworkService } from "./";

export class GasService {
  private networkService: NetworkService;

  constructor() {
    this.networkService = NetworkService.getInstance();
  }

  async checkAndRechargeGas(
    network: string,
    userAddress: string
  ): Promise<void> {
    const provider = await this.networkService.getProvider(network);
    const config = this.networkService.getConfig(network);
    const gasBalance = await provider.getBalance(userAddress);
    const minGas = ethers.parseEther(config.minGasLimit);

    if (gasBalance < minGas) {
      await this.rechargeGas(network, userAddress, provider, minGas);
    }
  }

  private async rechargeGas(
    network: string,
    userAddress: string,
    provider: ethers.Provider,
    minGas: bigint
  ): Promise<void> {
    const pkRechargeEthCldp = process.env.PK_RECHARGE_ETH_CLPD;
    if (!pkRechargeEthCldp) {
      throw new Error("PK_RECHARGE_ETH_CLPD not found");
    }

    const walletRecharge = new ethers.Wallet(pkRechargeEthCldp, provider);
    const tx = {
      to: userAddress,
      value: minGas * BigInt(2)
    };

    const txResponse = await walletRecharge.sendTransaction(tx);
    await txResponse.wait();
    console.log(`✅ Gas recharged in ${network}`);
  }
}