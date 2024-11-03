import * as jose from "jose";
import crypto from "crypto";
import { getPublicCompressed } from "@toruslabs/eccrypto";
import { BridgeRequest, ValidatedBridgeRequest } from "../types";

export class AuthService {
  static async validateAndDecryptRequest(request: Request): Promise<ValidatedBridgeRequest> {
    const {
      userAddress,
      networkIn,
      networkOut,
      amount,
      encryptedPKey,
      iv
    } = await request.json() as BridgeRequest;

    const idToken = request.headers.get("Authorization")?.split(" ")[1];
    const encryptionKey = request.headers.get("X-Encryption-Key") as string;

    if (!userAddress || !networkIn || !networkOut || !amount || !idToken || !encryptedPKey) {
      throw new Error("Missing required fields");
    }

    const decryptedKey = await this.decryptPrivateKey(encryptedPKey, iv, encryptionKey);
    await this.verifyToken(idToken, decryptedKey);

    return {
      userAddress,
      networkIn,
      networkOut,
      amount,
      encryptedPKey,
      iv,
      decryptedKey
    };
  }

  private static async decryptPrivateKey(
    encryptedPKey: string,
    iv: string,
    encryptionKey: string
  ): Promise<string> {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey, "hex"),
      Buffer.from(iv, "hex")
    );

    let pKey = decipher.update(encryptedPKey, "hex", "utf8");
    pKey += decipher.final("utf8");
    
    return pKey;
  }

  private static async verifyToken(idToken: string, pKey: string): Promise<void> {
    const appPubKey = getPublicCompressed(
      Buffer.from(pKey.padStart(64, "0"), "hex")
    ).toString("hex");

    const jwks = jose.createRemoteJWKSet(
      new URL("https://api-auth.web3auth.io/jwks")
    );

    const jwtDecoded = await jose.jwtVerify(idToken, jwks, {
      algorithms: ["ES256"],
    });

    const verifiedWallet = (jwtDecoded.payload as any).wallets.find(
      (x: { type: string }) => x.type === "web3auth_app_key"
    );

    if (!verifiedWallet || verifiedWallet.public_key.toLowerCase() !== appPubKey.toLowerCase()) {
      throw new Error("Verification Failed");
    }
  }
}