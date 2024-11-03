export interface BridgeRequest {
    userAddress: string;
    networkIn: "baseSepolia" | "sapphireTestnet";
    networkOut: "baseSepolia" | "sapphireTestnet";
    amount: number;
    encryptedPKey: string;
    iv: string;
  }
  
  export interface NetworkConfig {
    rpc: string;
    contractAddress: string;
    abi: any;
    minGasLimit: string;
    isEncrypted: boolean;
  }
  
  export interface ValidatedBridgeRequest extends BridgeRequest {
    decryptedKey: string;
  }