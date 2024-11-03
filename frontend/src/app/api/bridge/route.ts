import { NextResponse } from "next/server";
import { AuthService, NetworkService, BridgeService } from "./services";
import { formatEther } from "viem";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const bridgeRequest = await AuthService.validateAndDecryptRequest(request);
    const networkService = NetworkService.getInstance();
    const bridgeService = new BridgeService();
    
    // Inicializar provider
    await networkService.getProvider(bridgeRequest.networkIn);
    
    // Verificar balance CLPD
    const sourceContract = networkService.getContract(bridgeRequest.networkIn);
    const balance = await sourceContract.balanceOf(bridgeRequest.userAddress);
    console.log("💰 User CLPD balance in source network:", formatEther(balance));

    if (bridgeRequest.amount > Number(formatEther(balance))) {
      return NextResponse.json(
        { error: "❌ Insufficient CLPD balance for bridge" },
        { status: 400 }
      );
    }

    // Ejecutar bridge
    await bridgeService.executeBridge(
      bridgeRequest.userAddress,
      bridgeRequest.amount,
      bridgeRequest.decryptedKey,
      bridgeRequest.networkIn,
      bridgeRequest.networkOut
    );

    return NextResponse.json(
      { message: "✅ Bridge completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error processing bridge:", error);
    return NextResponse.json(
      { error: "❌ Internal Server Error" },
      { status: 500 }
    );
  }
}
