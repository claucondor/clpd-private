import { NextResponse } from "next/server";
import { TransactionService, BlockService } from "../services";
import { sapphireTestnet } from "viem/chains";
import { ethers } from "ethers";
import { TransactionRequest } from "../types";

export async function POST(request: Request) {
  try {
    const {
      userAddress,
      startBlock,
      endBlock,
      startDate,
      endDate
    }: TransactionRequest = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: "❌ Se requiere la dirección del usuario" },
        { status: 400 }
      );
    }

    // Inicializar provider de Sapphire
    const provider = new ethers.JsonRpcProvider(sapphireTestnet.rpcUrls.default.http[0]);

    // Obtener rango de bloques
    const blockRange = await BlockService.getBlockRange(
      startDate,
      endDate,
      startBlock,
      endBlock,
      provider
    );

    // Obtener transacciones
    const transactionService = new TransactionService();
    const transactions = await transactionService.getTransactions(
      userAddress,
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