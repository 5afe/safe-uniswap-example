import Safe from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import ERC20_ABI from "./utils/abi/erc20";
import { Token } from "@uniswap/sdk-core";
import WETH_ABI from "./utils/abi/weth";
import { FeeAmount, Pool, Route, SwapRouter } from "@uniswap/v3-sdk";
import { Trade } from "@uniswap/v3-sdk";
import { CurrencyAmount, TradeType } from "@uniswap/sdk-core";
import { SwapOptions } from "@uniswap/v3-sdk";
import { Percent } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import POOL_ABI from "./utils/abi/pool";
import { mainnet } from "viem/chains";
import { OperationType, MetaTransactionData } from "@safe-global/types-kit";

// Load environment variables from .env file
dotenv.config();

const fetchPoolData = async (
  publicClient: PublicClient,
  poolAddress: Address
) => {
  // Fetch slot0 data (current price, tick, etc.)
  const slot0 = (await publicClient.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "slot0",
  })) as any;

  // Fetch liquidity
  const liquidity = (await publicClient.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: "liquidity",
  })) as any;

  const sqrtPriceX96 = BigInt(slot0[0]);
  const tick = slot0[1];

  return { sqrtPriceX96, tick, liquidity: BigInt(liquidity) };
};

const main = async () => {
  // Destructure environment variables
  const { SAFE_ADDRESS, SIGNER_PRIVATE_KEY, RPC_URL } = process.env;

  // Check if all required environment variables are present
  if (!SAFE_ADDRESS || !SIGNER_PRIVATE_KEY || !RPC_URL) {
    throw new Error("Missing environment variables in .env file");
  }

  const customChain = defineChain({
    ...mainnet,
    name: "custom chain",
    transport: http(RPC_URL),
  });

  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY as `0x${string}`);

  // Set up viem clients and accounts
  const publicClient = createPublicClient({
    transport: http(RPC_URL!),
    chain: customChain,
  });
  const walletClient = createWalletClient({
    transport: http(RPC_URL!),
    chain: customChain,
  });

  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: SIGNER_PRIVATE_KEY,
    safeAddress: SAFE_ADDRESS,
  });

  const isSafeDeployed = await protocolKit.isSafeDeployed(); // True

  if (!isSafeDeployed) {
    throw new Error("Safe not deployed");
  }

  const chainId = (await publicClient.getChainId());

  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDC_ETH_POOL_ADDRESS = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
  const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 Router
  const INPUT_AMOUNT = "100000000000"; // Amount of ETH to swap to USDC
  const OUTOUT_AMOUNT = "0"; // 0 USDC

  // Define token details
  const USDC = new Token(chainId, USDC_ADDRESS, 6, "USDC", "USD Coin");
  const WETH = new Token(chainId, WETH_ADDRESS, 18, "WETH", "Wrapped Ether");

  const callDataDeposit = encodeFunctionData({
    abi: WETH_ABI,
    functionName: "deposit",
    args: [],
  });

  // Exchange ETH to WETH
  const safeDepositTx: MetaTransactionData = {
    to: WETH_ADDRESS,
    value: INPUT_AMOUNT,
    data: callDataDeposit,
    operation: OperationType.Call,
  };

  const callDataApprove = encodeFunctionData({
    abi: WETH_ABI,
    functionName: "approve",
    args: [SWAP_ROUTER_ADDRESS, INPUT_AMOUNT],
  });

  const safeApproveTx: MetaTransactionData = {
    to: WETH_ADDRESS,
    value: "0",
    data: callDataApprove,
    operation: OperationType.Call,
  };

  const options: SwapOptions = {
    slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: SAFE_ADDRESS,
  };

  const poolInfo = await fetchPoolData(publicClient, USDC_ETH_POOL_ADDRESS);

  // Create the pool object
  const pool = new Pool(
    WETH,
    USDC,
    FeeAmount.MEDIUM,
    JSBI.BigInt(poolInfo.sqrtPriceX96.toString()),
    JSBI.BigInt(poolInfo.liquidity.toString()),
    poolInfo.tick
  );

  const swapRoute = new Route([pool], WETH, USDC);

  const uncheckedTrade = Trade.createUncheckedTrade({
    tradeType: TradeType.EXACT_INPUT,
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(WETH, 
      INPUT_AMOUNT
    ),
    outputAmount: CurrencyAmount.fromRawAmount(USDC, OUTOUT_AMOUNT),
  });

  const methodParameters = SwapRouter.swapCallParameters(
    [uncheckedTrade],
    options
  );

  const safeSwapTx: MetaTransactionData = {
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    data: methodParameters.calldata,
    operation: OperationType.Call,
  };

  console.log(`ETH balance before: ${await publicClient.getBalance({address: SAFE_ADDRESS as `0x${string}`})}`);

  const wethBalanceBefore = await publicClient.readContract({
    abi: ERC20_ABI,
    address: WETH_ADDRESS,
    functionName: "balanceOf",
    args: [SAFE_ADDRESS],
  });

  console.log("WETH balance before: ", wethBalanceBefore);

  const usdcBalanceBefore = await publicClient.readContract({
    abi: ERC20_ABI,
    address: USDC_ADDRESS,
    functionName: "balanceOf",
    args: [SAFE_ADDRESS],
  });

  console.log("USDC balance before: ", usdcBalanceBefore);

  const safeTx = await protocolKit.createTransaction({
    transactions: [safeDepositTx, safeApproveTx, safeSwapTx],
    onlyCalls: true,
  });

  const txResponse = await protocolKit.executeTransaction(safeTx);
  await publicClient.waitForTransactionReceipt({
    hash: txResponse.hash as `0x${string}`,
  });

  console.log(`Deposit and approve transaction: [${txResponse.hash}]`);

  console.log(`ETH balance after: ${await publicClient.getBalance({address: SAFE_ADDRESS as `0x${string}`})}`);

  const wethBalanceAfter = await publicClient.readContract({
    abi: ERC20_ABI,
    address: WETH_ADDRESS,
    functionName: "balanceOf",
    args: [SAFE_ADDRESS],
  });

  console.log("WETH balance after: ", wethBalanceAfter);

  const usdcBalanceAfter = await publicClient.readContract({
    abi: ERC20_ABI,
    address: USDC_ADDRESS,
    functionName: "balanceOf",
    args: [SAFE_ADDRESS],
  });

  console.log("USDC balance after: ", usdcBalanceAfter);
};

// Execute the main function and catch any errors
main().catch((error) => {
  console.error("Error:", error);
});
