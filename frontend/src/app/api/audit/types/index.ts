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