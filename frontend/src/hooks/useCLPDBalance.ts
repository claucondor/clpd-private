// react
import { useMemo } from "react";
// viem
import { erc20Abi, formatUnits, zeroAddress } from "viem";
// wagmi
import { useReadContracts } from "wagmi";
// constants
import { addresses } from "@/constants/address";
import clpdSapphireAbi from "@/constants/clpd-sapphire-abi.json";
// provider
import { selectedChain } from "@/provider/WagmiConfig";
import { sapphireTestnet } from "viem/chains";

export const useCLPDBalance = ({
  address,
  chainId,
  _chainName,
}: {
  address: `0x${string}` | undefined;
  chainId?: number;
  _chainName?: string;
}) => {
  const chainName = _chainName ?? selectedChain.name.toLowerCase();
  
   console.log('Addresses config SEPOLIA:', {
    fullConfig: addresses,
    chainConfig: addresses[chainName],
    CLPDAddress: addresses[chainName]?.CLPD?.address
  });

  const contractAddress = addresses[chainName]?.CLPD?.address;
  if (!contractAddress) {
    console.error('Contract address is invalid for chain:', chainName);
    return { clpdBalanceFormatted: "0", refetch: () => {} };
  }

  const clpdBalance = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: contractAddress as `0x${string}`,
        abi: chainId === sapphireTestnet.id ? clpdSapphireAbi : erc20Abi,
        functionName: "balanceOf",
        args: [address ?? zeroAddress],
        chainId: chainId ?? selectedChain.id,
      }
    ],
  });


  console.log('CLPD Balance response:', {
    data: clpdBalance.data,
    isError: clpdBalance.isError,
    error: clpdBalance.error
  });

  const clpdBalanceFormatted = useMemo(() => {
    if (!clpdBalance.data || !clpdBalance.data[0]) {
      console.log('No balance data available');
      return "0";
    }
    const rawBalance = clpdBalance.data[0] as bigint;
    const formattedBalance = formatUnits(rawBalance, 18);
    console.log('Balance formatting:', {
      rawBalance,
      formattedBalance,
      finalBalance: Number(formattedBalance).toFixed(2)
    });
    return Number(formattedBalance || 0).toFixed(2);
  }, [clpdBalance.data]);

  return { clpdBalanceFormatted, refetch: clpdBalance.refetch };
};
