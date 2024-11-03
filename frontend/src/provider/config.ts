import { createConfig, http } from "@wagmi/core";
import { base, baseSepolia, sapphireTestnet } from "@wagmi/core/chains";
import { createClient } from "viem";

export const config = createConfig({
  chains: [base, baseSepolia, sapphireTestnet],
  client({ chain }) {
    return createClient({ chain, transport: http() });
  },
});
