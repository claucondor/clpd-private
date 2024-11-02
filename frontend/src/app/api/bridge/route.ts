// jose
import * as jose from "jose";

// eccrypto
import { getPublicCompressed } from "@toruslabs/eccrypto";

// constants
import CLPD_ABI from "@/constants/CLPD-abi.json";
import CLPD_ABI_SAPPHIRE from "@/constants/clpd-sapphire-abi.json";
import { addresses } from "@/constants/address";

// next
import { NextResponse } from "next/server";

// crypto
import crypto from "crypto";
import { ethers, parseEther, parseUnits } from "ethers";

// viem
import { baseSepolia, sapphireTestnet } from "viem/chains";
import { formatEther } from "viem";

export async function POST(request: Request) {
  console.log("[POST][api/bridge]");
  const {
    userAddress,
    networkIn,
    networkOut,
    amount,
    encryptedPKey,
    iv,
  }: {
    userAddress: string;
    networkIn: "baseSepolia" | "sapphireTestnet";
    networkOut: "baseSepolia" | "sapphireTestnet";
    amount: number;
    encryptedPKey: string;
    iv: string;
  } = await request.json();

  const idToken = request.headers.get("Authorization")?.split(" ")[1];
  const encryptionKey = request.headers.get("X-Encryption-Key") as string;

  if (!userAddress || !networkIn || !networkOut || !amount || !idToken || !encryptedPKey) {
    return NextResponse.json(
      {
        error:
          "userAddress, networkIn, networkOut, amount, idToken, and encryptedPKey are required",
      },
      { status: 400 }
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "hex"),
    Buffer.from(iv, "hex")
  );

  let pKey = decipher.update(encryptedPKey, "hex", "utf8");
  pKey += decipher.final("utf8");

  try {
    const appPubKey = getPublicCompressed(Buffer.from(pKey.padStart(64, "0"), "hex")).toString(
      "hex"
    );

    const jwks = jose.createRemoteJWKSet(new URL("https://api-auth.web3auth.io/jwks"));

    const jwtDecoded = await jose.jwtVerify(idToken, jwks, {
      algorithms: ["ES256"],
    });

    const verifiedWallet = (jwtDecoded.payload as any).wallets.find(
      (x: { type: string }) => x.type === "web3auth_app_key"
    );

    if (!verifiedWallet || verifiedWallet.public_key.toLowerCase() !== appPubKey.toLowerCase()) {
      return NextResponse.json({ error: "Verification Failed" }, { status: 400 });
    }

    const userPrivateKey = pKey;

    // Check if user has enough CLPD balance
    const rpc =
      networkIn === "baseSepolia"
        ? baseSepolia.rpcUrls.default.http[0]
        : sapphireTestnet.rpcUrls.default.http[0];
    const clpdAddress =
      networkIn === "baseSepolia"
        ? addresses.baseSepolia.CLPD.address
        : addresses.sapphireTestnet.CLPD.address;
    const ABI = networkIn === "baseSepolia" ? CLPD_ABI : CLPD_ABI_SAPPHIRE;
    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(clpdAddress, ABI, provider);
    const balance = await contract.balanceOf(userAddress);

    console.log("💰 Transfer CLPD amount:", amount);
    console.log("💰 User CLPD balance:", formatEther(balance));

    // if (amount > Number(formatEther(balance))) {
    //   console.log("❌ Insufficient CLPD balance");
    //   return NextResponse.json({ error: "❌ Insufficient CLPD balance" }, { status: 400 });
    // }

    // TODO: guardar en la base de datos que se realizó la transferencia

    return NextResponse.json({ message: "✅ Transfer completed successfully" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error processing transfer:", error);
    return NextResponse.json({ error: "❌ Internal Server Error" }, { status: 500 });
  }
}
