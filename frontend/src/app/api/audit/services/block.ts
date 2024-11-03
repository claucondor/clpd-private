import { ethers } from "ethers";

export class BlockService {
  static async getBlockNumberFromDate(
    date: Date,
    provider: ethers.Provider
  ): Promise<number> {
    const targetTimestamp = Math.floor(date.getTime() / 1000);
    let left = 1;
    let right = await provider.getBlockNumber();
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const block = await provider.getBlock(mid);
      
      if (!block) continue;
      
      if (block.timestamp === targetTimestamp) {
        return mid;
      }
      
      if (block.timestamp < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return right;
  }

  static async getBlockRange(
    startDate: string | undefined,
    endDate: string | undefined,
    startBlock: number | undefined,
    endBlock: number | undefined,
    provider: ethers.Provider
  ): Promise<{ start: number; end: number }> {
    let finalStartBlock = startBlock;
    let finalEndBlock = endBlock;

    if (startDate) {
      finalStartBlock = await this.getBlockNumberFromDate(
        new Date(startDate),
        provider
      );
    }

    if (endDate) {
      finalEndBlock = await this.getBlockNumberFromDate(
        new Date(endDate),
        provider
      );
    }

    if (!finalStartBlock) {
      finalStartBlock = Math.max(
        (await provider.getBlockNumber()) - 1000, // últimos 1000 bloques por defecto
        0
      );
    }

    if (!finalEndBlock) {
      finalEndBlock = await provider.getBlockNumber();
    }

    return { start: finalStartBlock, end: finalEndBlock };
  }
}