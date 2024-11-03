import { ethers } from "ethers";
import { NetworkService, GasService } from "../../bridge/services";
import { DecryptedTransaction, ConfidentialEventLog } from "../types";
import { sapphireTestnet } from "viem/chains";

export class TransactionService {
  private networkService: NetworkService;
  private gasService: GasService;
  private readonly SAPPHIRE_GAS_LIMIT = 10000000;
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor() {
    this.networkService = NetworkService.getInstance();
    this.gasService = new GasService();
    this.provider = new ethers.JsonRpcProvider(sapphireTestnet.rpcUrls.default.http[0]);
    this.contract = this.networkService.getContract("sapphireTestnet");
  }

  async getTransactions(
    userAddress: string,
    userPrivateKey: string,
    startBlock: number,
    endBlock: number
  ): Promise<DecryptedTransaction[]> {
    // Verificar y recargar gas para Sapphire
    await this.gasService.checkAndRechargeGas("sapphireTestnet", userAddress);

    // Configurar wallet y contrato con signer
    const wallet = new ethers.Wallet(userPrivateKey, this.provider);
    const contractWithSigner: any = this.contract.connect(wallet);

    // Obtener eventos
    const confidentialEvents = await this.getConfidentialEvents(startBlock, endBlock);
    const decryptedTransactions: DecryptedTransaction[] = [];

    for (const event of confidentialEvents) {
      try {
        const confidentialLog = event as ConfidentialEventLog;
        const encryptedData = confidentialLog.args[0];
        
        // 1. Procesar la desencriptación con la wallet del usuario
        const processTx = await contractWithSigner.processDecryption(
          encryptedData,
          { gasLimit: this.SAPPHIRE_GAS_LIMIT }
        );
        await processTx.wait();

        // 2. Obtener datos desencriptados
        const decryptedData = await contractWithSigner.viewLastDecryptedData();

        if (
          decryptedData.decryptedFrom.toLowerCase() === userAddress.toLowerCase() ||
          decryptedData.decryptedTo.toLowerCase() === userAddress.toLowerCase()
        ) {
          decryptedTransactions.push({
            from: decryptedData.decryptedFrom,
            to: decryptedData.decryptedTo,
            amount: ethers.formatEther(decryptedData.amount),
            action: decryptedData.action,
            timestamp: Number(decryptedData.timestamp),
            transactionHash: confidentialLog.transactionHash,
            blockNumber: confidentialLog.blockNumber
          });
        }

        // 3. Limpiar datos desencriptados
        const clearTx = await contractWithSigner.clearLastDecryptedData({
          gasLimit: this.SAPPHIRE_GAS_LIMIT
        });
        await clearTx.wait();

      } catch (error) {
        console.error("Error decrypting transaction:", error);
        continue;
      }
    }

    return decryptedTransactions;
  }

  private async getConfidentialEvents(
    startBlock: number,
    endBlock: number
  ): Promise<ConfidentialEventLog[]> {
    const eventFilters = [
      this.contract.filters.ConfidentialTransfer(),
      this.contract.filters.ConfidentialMint(),
      this.contract.filters.ConfidentialBurn()
    ];

    const eventPromises = eventFilters.map(filter => 
      this.contract.queryFilter(filter, startBlock, endBlock)
    );

    const events = await Promise.all(eventPromises);
    return events
      .flat()
      .sort((a, b) => a.blockNumber - b.blockNumber) as ConfidentialEventLog[];
  }
}