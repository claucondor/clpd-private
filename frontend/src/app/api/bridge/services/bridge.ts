import { ethers } from "ethers";
import { NetworkService, GasService } from "./";
import { addresses } from "@/constants/address";

export class BridgeService {
  private networkService: NetworkService;
  private gasService: GasService;

  constructor() {
    this.networkService = NetworkService.getInstance();
    this.gasService = new GasService();
  }

  async executeBridge(
    userAddress: string,
    amount: number,
    userPrivateKey: string,
    networkIn: string,
    networkOut: string
  ): Promise<void> {
    // Verificar gas en ambas redes
    await this.gasService.checkAndRechargeGas(networkIn, userAddress);
    await this.gasService.checkAndRechargeGas(networkOut, userAddress);

    // Ejecutar bridge
    await this.executeBurnAndMint(
      userAddress,
      amount,
      userPrivateKey,
      networkIn,
      networkOut
    );
  }

  private async executeBurnAndMint(
    userAddress: string,
    amount: number,
    userPrivateKey: string,
    networkIn: string,
    networkOut: string
  ): Promise<void> {
    const sourceProvider = await this.networkService.getProvider(networkIn);
    const sourceContract = this.networkService.getContract(networkIn);
    const sourceConfig = this.networkService.getConfig(networkIn);
    
    const wallet = new ethers.Wallet(userPrivateKey, sourceProvider);
    const sourceContractWithSigner: any = sourceContract.connect(wallet);
    const amountWithDecimals = ethers.parseUnits(
      amount.toString(),
      addresses.base.CLPD.decimals
    );

    // 1. Bridge (burn) en red origen
    console.log("🔥 Initiating bridge (burn) in source network...");
    const bridgeTx = await sourceContractWithSigner.bridgeCLPD(
      amountWithDecimals,
      {
        gasLimit: sourceConfig.isEncrypted ? 10000000 : undefined
      }
    );
    await bridgeTx.wait();

    // 2. Mint en red destino
    await this.executeMint(userAddress, amountWithDecimals, networkOut);
  }

  private async executeMint(
    userAddress: string,
    amount: bigint,
    networkOut: string
  ): Promise<void> {
    const targetContract = this.networkService.getContract(networkOut);
    const targetConfig = this.networkService.getConfig(networkOut);
    const targetProvider = await this.networkService.getProvider(networkOut);
    
    const agentWallet = new ethers.Wallet(
      process.env.PK_RECHARGE_ETH_CLPD!,
      targetProvider
    );
    const targetContractWithSigner: any = targetContract.connect(agentWallet);

    console.log("🌱 Minting tokens in target network...");
    const mintTx = await targetContractWithSigner.mint(userAddress, amount, {
      gasLimit: targetConfig.isEncrypted ? 10000000 : undefined
    });
    await mintTx.wait();
  }
}