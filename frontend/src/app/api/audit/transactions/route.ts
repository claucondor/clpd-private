import { NextResponse } from "next/server";
import { sapphireTestnet } from "viem/chains";
import { ethers } from "ethers";
import { AuditAuthService, BlockService, TransactionService } from "../services";

export async function POST(request: Request) {
  try {
    const validatedRequest = await AuditAuthService.validateAndDecryptRequest(request);
    
    const provider = new ethers.JsonRpcProvider(sapphireTestnet.rpcUrls.default.http[0]);

    const blockRange = await BlockService.getBlockRange(
      validatedRequest.startDate,
      validatedRequest.endDate,
      validatedRequest.startBlock,
      validatedRequest.endBlock,
      provider
    );

    const transactionService = new TransactionService();
    const transactions = await transactionService.getTransactions(
      validatedRequest.userAddress,
      validatedRequest.decryptedKey,
      blockRange.start,
      blockRange.end
    );

    return NextResponse.json({
      transactions,
      totalTransactions: transactions.length,
      startBlock: blockRange.start,
      endBlock: blockRange.end,
      message: "✅ Transacciones recuperadas exitosamente"
    });

  } catch (error) {
    console.error("❌ Error al obtener transacciones:", error);
    return NextResponse.json(
      { 
        error: "❌ Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}