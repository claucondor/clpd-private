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

  /* CLPD Balance */
  const clpdBalance = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: addresses[chainName].CLPD.address,
        abi: chainId === sapphireTestnet.id ? clpdSapphireAbi : erc20Abi,
        functionName: "balanceOf",
        args: [address ?? zeroAddress],
        chainId: chainId ?? selectedChain.id,
      },
      {
        address: addresses[chainName].CLPD.address,
        abi: chainId === sapphireTestnet.id ? clpdSapphireAbi : erc20Abi,
        functionName: "decimals",
        chainId: chainId ?? selectedChain.id,
      },
    ],
  });

  const clpdBalanceFormatted = useMemo(() => {
    console.log("clpdBalance", clpdBalance.data, chainName);
    if (!clpdBalance.data || !clpdBalance.data[0]) return "0";
    return Number(formatUnits(clpdBalance.data?.[0]! as bigint, 18) || 0).toFixed(2);
  }, [clpdBalance.data]);

  return { clpdBalanceFormatted, refetch: clpdBalance.refetch };
};
