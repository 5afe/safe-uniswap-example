import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Load environment variables from .env file
dotenv.config();

const main = async () => {
  // Destructure environment variables
  const { SAFE_ADDRESS, SIGNER_PRIVATE_KEY, RPC_URL } = process.env;

  // Check if all required environment variables are present
  if (!SIGNER_PRIVATE_KEY || !RPC_URL) {
    throw new Error("Missing environment variables in .env file");
  }

  const safeAccountConfig: SafeAccountConfig = {
    owners: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
    threshold: 1,
    // More optional properties
  };

  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig,
    // More optional properties
  };

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: SIGNER_PRIVATE_KEY,
    predictedSafe,
  });

  const safeAddress = await protocolKit.getAddress();
  console.log(`Safe address: ${safeAddress}`);

  const deploymentTransaction =
    await protocolKit.createSafeDeploymentTransaction();

  const client = await protocolKit.getSafeProvider().getExternalSigner();

  if (!client) return;

  const customChain = defineChain({
    ...mainnet,
    name: "custom chain",
    transport: http(RPC_URL),
  });

  const transactionHash = await client.sendTransaction({
    to: deploymentTransaction.to as `0x${string}`,
    value: BigInt(deploymentTransaction.value),
    data: deploymentTransaction.data as `0x${string}`,
    chain: customChain,
  });

  const walletClient = createWalletClient({ transport: http(RPC_URL!), chain: customChain });
  const publicClient = createPublicClient({
    chain: customChain,
    transport: http(),
  });

  const txr = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  console.log(`Transaction hash: ${transactionHash}`);

  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY as `0x${string}`);
  // Fund Safe
  await walletClient.sendTransaction({
    account: account,
    to: SAFE_ADDRESS as `0x${string}`,
    value: BigInt(1),
  });
};

// Execute the main function and catch any errors
main().catch((error) => {
  console.error("Error:", error);
});
