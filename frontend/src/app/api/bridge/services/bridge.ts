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
    
    console.log("Esperando confirmación del mint...");
    const mintReceipt = await mintTx.wait();
    
    const eventName = networkOut === "baseSepolia" ? "ConfidentialBurn(bytes)" : "ConfidentialMint(bytes)";
    const confidentialLog = mintReceipt.logs.find((log: ethers.Log) => 
        log.topics[0] === ethers.id(eventName)
    );
    
    if (confidentialLog) {
        console.log(`\n=== Evento ${eventName} en ${networkOut} ===`);
        const encryptedData = confidentialLog.args[0];
        
        console.log("\nDatos encriptados detallados:");
        console.log("Tipo:", typeof encryptedData);
        console.log("Es Hex:", ethers.isHexString(encryptedData));
        console.log("Longitud:", encryptedData.length);
        console.log("Datos:", encryptedData);
    }
}

  private async updateApiDataInBothNetworks(
    amount: bigint,
    networkIn: string,
    networkOut: string,
    isPreBridge: boolean
  ): Promise<void> {
    const BANK_BALANCE = ethers.parseUnits("5991918", 18);
    const agentPK = process.env.PK_RECHARGE_ETH_CLPD!;

    // Obtener totalSupply de ambas cadenas
    const contractIn = this.networkService.getContract(networkIn);
    const contractOut = this.networkService.getContract(networkOut);

    const totalSupplyIn = await contractIn.totalSupply();
    const totalSupplyOut = await contractOut.totalSupply();

    // Calcular nuevo chainSupply para cada red
    let newChainSupplyIn: bigint;
    let newChainSupplyOut: bigint;

    if (isPreBridge) {
      console.log("📊 Pre-bridge amounts:");
      console.log("- Total supply in source chain:", totalSupplyIn.toString());
      console.log("- Amount to bridge:", amount.toString());
      // Pre-bridge: restar amount de la red origen
      newChainSupplyIn = totalSupplyIn - amount;
      newChainSupplyOut = totalSupplyOut;
      console.log("- New chain supply in source:", newChainSupplyIn.toString());
    } else {
      console.log("📊 Post-bridge amounts:");
      console.log("- Total supply in target chain:", totalSupplyOut.toString());
      console.log("- Amount bridged:", amount.toString());
      // Post-bridge: sumar amount en la red destino
      newChainSupplyIn = totalSupplyIn;
      newChainSupplyOut = totalSupplyOut + amount;
      console.log("- New chain supply in target:", newChainSupplyOut.toString());
    }

    // Calcular totalChainSupply combinado para ambas redes
    const combinedChainSupply = newChainSupplyIn + newChainSupplyOut;
    console.log("📈 Combined chain supply:", combinedChainSupply.toString());

    // Actualizar en ambas redes con el mismo combinedChainSupply
    await this.updateNetworkApiData(networkIn, BANK_BALANCE, combinedChainSupply, agentPK);
    await this.updateNetworkApiData(networkOut, BANK_BALANCE, combinedChainSupply, agentPK);
  }

  private async updateNetworkApiData(
    network: string,
    bankBalance: bigint,
    combinedChainSupply: bigint,
    agentPK: string
  ): Promise<void> {
    const provider = await this.networkService.getProvider(network);
    const contract = this.networkService.getContract(network);
    const config = this.networkService.getConfig(network);

    const agentWallet = new ethers.Wallet(agentPK, provider);
    const contractWithSigner: any = contract.connect(agentWallet);

    console.log(`📊 Updating API data in ${network}...`);
    const method = network === "baseSepolia" ? "verifyValueAPI" : "updateApiData";
    const arg =
      network === "baseSepolia"
        ? [combinedChainSupply, bankBalance]
        : [bankBalance, combinedChainSupply];
    const updateTx = await contractWithSigner[method](...arg, {
      gasLimit: config.isEncrypted ? 10000000 : undefined,
    });
    await updateTx.wait();
  }
}
