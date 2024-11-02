// jose

// eccrypto

// constants
import CLPD_ABI from "@/constants/CLPD-abi.json";
import { addresses } from "@/constants/address";

// next
import { NextResponse } from "next/server";

// crypto
import { ethers } from "ethers";

// viem
import { formatEther } from "viem";
import { baseSepolia } from "viem/chains";

export async function POST(request: Request) {
  const { userAddress } = await request.json();

  const idToken = request.headers.get("Authorization")?.split(" ")[1];

  if (!userAddress || !idToken) {
    return NextResponse.json({ error: "userAddress and idToken are required" }, { status: 400 });
  }

  try {
    const FAUCET_MAX_BALANCE = 100;
    // Check if user has enough CLPD balance
    const provider = new ethers.JsonRpcProvider(baseSepolia.rpcUrls.default.http[0]);
    const contract = new ethers.Contract(addresses.baseSepolia.CLPD.address, CLPD_ABI, provider);
    const balance = await contract.balanceOf(userAddress);

    console.log("💰 User CLPD balance:", formatEther(balance));

    if (Number(formatEther(balance)) >= FAUCET_MAX_BALANCE) {
      console.log("❌ Sufficient CLPD balance");
      return NextResponse.json({ error: "❌ Sufficient CLPD balance" }, { status: 400 });
    }

    // TODO: faucet clpd

    return NextResponse.json({ message: "✅ Transfer completed successfully" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error processing transfer:", error);
    return NextResponse.json({ error: "❌ Internal Server Error" }, { status: 500 });
  }
}
