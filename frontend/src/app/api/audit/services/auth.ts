import crypto from "crypto";
import { AuditRequest, ValidatedAuditRequest } from "../types";

export class AuditAuthService {
  static async validateAndDecryptRequest(request: Request): Promise<ValidatedAuditRequest> {
    const {
      userAddress,
      encryptedPKey,
      iv,
      startBlock,
      endBlock,
      startDate,
      endDate
    } = await request.json() as AuditRequest;

    const encryptionKey = request.headers.get("X-Encryption-Key") as string;

    if (!userAddress || !encryptedPKey || !iv) {
      throw new Error("Faltan campos requeridos");
    }

    if (!encryptionKey) {
      throw new Error("Falta la clave de encriptación");
    }

    const decryptedKey = await this.decryptPrivateKey(encryptedPKey, iv, encryptionKey);

    return {
      userAddress,
      decryptedKey,
      startBlock,
      endBlock,
      startDate,
      endDate
    };
  }

  private static async decryptPrivateKey(
    encryptedPKey: string,
    iv: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(encryptionKey, "hex"),
        Buffer.from(iv, "hex")
      );

      let pKey = decipher.update(encryptedPKey, "hex", "utf8");
      pKey += decipher.final("utf8");
      
      return pKey;
    } catch (error) {
      throw new Error("Error al desencriptar la clave privada");
    }
  }
}