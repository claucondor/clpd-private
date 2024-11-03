import { ethers } from "ethers";

export interface TransactionRequest {
  userAddress: string;
  encryptedPKey: string;
  iv: string;
  startBlock?: number;
  endBlock?: number;
  startDate?: string;
  endDate?: string;
}
export interface ValidatedAuditRequest {
  userAddress: string;
  decryptedKey: string;
  startBlock?: number;
  endBlock?: number;
  startDate?: string;
  endDate?: string;
}

export interface AuditRequest extends TransactionRequest {
  encryptedPKey: string;
  iv: string;
}
export interface DecryptedTransaction {
  from: string;
  to: string;
  amount: string;
  action: string;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}

export interface TransactionAuditResponse {
  transactions: DecryptedTransaction[];
  totalTransactions: number;
  startBlock: number;
  endBlock: number;
}

export interface ConfidentialEventLog extends ethers.Log {
  args: string[];
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

export interface ConfidentialTransactionReceipt extends ethers.TransactionReceipt {
  logs: ConfidentialEventLog[];
}
