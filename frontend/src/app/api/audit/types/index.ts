import { ethers } from "ethers";

export interface TransactionRequest {
    userAddress: string;
    startBlock?: number;
    endBlock?: number;
    startDate?: string;
    endDate?: string;
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