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
    await this.executeBurnAndMint(userAddress, amount, userPrivateKey, networkIn, networkOut);
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
    const amountWithDecimals = ethers.parseUnits(amount.toString(), addresses.base.CLPD.decimals);

    // Actualizar datos API antes del bridge en ambas redes
    await this.updateApiDataInBothNetworks(amountWithDecimals, networkIn, networkOut, true);

    // 1. Bridge (burn) en red origen
    console.log("🔥 Initiating bridge (burn) in source network...");
    const bridgeTx = await sourceContractWithSigner.bridgeCLPD(amountWithDecimals, {
      gasLimit: sourceConfig.isEncrypted ? 10000000 : undefined,
    });
    await bridgeTx.wait();

    // 2. Mint en red destino
    await this.executeMint(userAddress, amountWithDecimals, networkOut);

    // Actualizar datos API después del bridge en ambas redes
    await this.updateApiDataInBothNetworks(amountWithDecimals, networkIn, networkOut, false);
  }

  private async executeMint(
    userAddress: string,
    amount: bigint,
    networkOut: string
  ): Promise<void> {
    const targetContract = this.networkService.getContract(networkOut);
    const targetConfig = this.networkService.getConfig(networkOut);
    const targetProvider = await this.networkService.getProvider(networkOut);

    const agentWallet = new ethers.Wallet(process.env.PK_RECHARGE_ETH_CLPD!, targetProvider);
    const targetContractWithSigner: any = targetContract.connect(agentWallet);

    console.log("🌱 Minting tokens in target network...");
    const mintTx = await targetContractWithSigner.mint(userAddress, amount, {
      gasLimit: targetConfig.isEncrypted ? 10000000 : undefined,
    });
    await mintTx.wait();
  }

  private async updateApiDataInBothNetworks(
    amount: bigint,
    networkIn: string,
    networkOut: string,
    isPreBridge: boolean
  ): Promise<void> {
    const BANK_BALANCE = ethers.parseUnits("5691918", 18);
    const agentPK = process.env.PK_RECHARGE_ETH_CLPD!;

    // Actualizar en red origen
    await this.updateNetworkApiData(networkIn, amount, BANK_BALANCE, agentPK, isPreBridge);
    // Actualizar en red destino
    await this.updateNetworkApiData(networkOut, amount, BANK_BALANCE, agentPK, isPreBridge);
  }

  private async updateNetworkApiData(
    network: string,
    amount: bigint,
    bankBalance: bigint,
    agentPK: string,
    isPreBridge: boolean
  ): Promise<void> {
    const provider = await this.networkService.getProvider(network);
    const contract = this.networkService.getContract(network);
    const config = this.networkService.getConfig(network);

    const agentWallet = new ethers.Wallet(agentPK, provider);
    const contractWithSigner: any = contract.connect(agentWallet);

    // Obtener totalSupply actual y modificarlo según la operación
    const currentSupply = await contract.totalSupply();
    const newChainSupply = isPreBridge
      ? currentSupply - amount // Reducir antes del bridge
      : currentSupply + amount; // Aumentar después del bridge

    console.log(`📊 Updating API data in ${network}...`);
    const method = network === "baseSepolia" ? "verifyValueAPI" : "updateApiData";
    const arg =
      network === "baseSepolia" ? [newChainSupply, bankBalance] : [bankBalance, newChainSupply];
    const updateTx = await contractWithSigner[method](...arg, {
      gasLimit: config.isEncrypted ? 10000000 : undefined,
    });
    await updateTx.wait();
  }
}
