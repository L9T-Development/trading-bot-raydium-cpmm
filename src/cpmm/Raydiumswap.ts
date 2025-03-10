import {
  CpmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  ReturnTypeFetchMultiplePoolTickArrays,
  ApiV3Token,
  TickArray,
  Raydium,
  ApiV3PoolInfoStandardItemCpmm,
  CurveCalculator,
  TxVersion,
  CurrencyAmount,
  Currency,
  splAccountLayout,
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  CpmmRpcData,
  CpmmPoolInfoInterface,
  SwapResult,
  TxBuildData
} from '@raydium-io/raydium-sdk-v2';
import {
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  Connection,
  PublicKey,
  Signer,
  Keypair,
  ComputeBudgetInstruction,
  TransactionMessage,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import BN from 'bn.js';
import {
  initSdk,
  logger,
  isValidCpmm,
  sleep,
  getWallet,
  txVersion,
  RPC_ENDPOINT,
  POOL_ADDRESS,
  COMPUTE_UNIT_LIMIT,
  COMPUTE_UNIT_PRICE,
  BUFFER,
} from '../config';
import { K } from '@raydium-io/raydium-sdk-v2/lib/type-7da56d56';
import { isReturnStatement } from 'typescript';
import { TransportMultiOptions } from 'pino';
import { publicKey } from '@project-serum/anchor/dist/cjs/utils';
import { MINT_SIZE, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import InstructionNamespaceFactory from '@project-serum/anchor/dist/cjs/program/namespace/instruction';
import { sign } from 'crypto';
import { promises } from 'fs';


// Constants at the top level
const POOL_ID = POOL_ADDRESS;
const JITP_TIP_ACCOUNTS = [
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
];

/**
 * Returns a random validator public key
 */
const getRandomValidatorKey = () => {
  const randomValidator = JITP_TIP_ACCOUNTS[Math.floor(Math.random() * JITP_TIP_ACCOUNTS.length)];
  return new PublicKey(randomValidator);
};

export const getPoolInfo = async (connection: Connection, wallet: Keypair) => {

  const raydium = await initSdk(connection, wallet);
  let poolInfo: ApiV3PoolInfoStandardItemCpmm;
  let poolKeys: CpmmKeys | undefined;
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays;
  let cpmmPoolInfo: CpmmPoolInfoInterface;
  let rpcData: CpmmRpcData;

  if (raydium.cluster === 'mainnet') {
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm;
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool');
    rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true);
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId);
    poolInfo = data.poolInfo;
    poolKeys = data.poolKeys;
    rpcData = data.rpcData;
  }

  return {
    raydium: raydium,
    poolInfo: poolInfo,
    poolKeys: poolKeys,
    rpcData: rpcData,
  };
};

export const getAmountOut = async (inputAmount: BN, baseIn: boolean, rpcData: CpmmRpcData) => {
  return CurveCalculator.swap(
    inputAmount,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    rpcData.configInfo!.tradeFeeRate,
  )
};

export const makeSwapTransaction = async (
  raydium: Raydium,
  poolInfo: ApiV3PoolInfoStandardItemCpmm,
  poolKeys: CpmmKeys,
  payer: PublicKey,
  baseIn: boolean,
  slippage: number,
  swapResult: SwapResult,
): Promise<VersionedTransaction> => {
  const { transaction, execute } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    payer,
    baseIn,
    slippage,
    swapResult,
  });
  const { signedTx } = await execute();
  let transaction1 = signedTx;
  return transaction as VersionedTransaction
}


export const confirm = async (
  connection: Connection,
  signature: string,
  latestBlockhash: BlockhashWithExpiryBlockHeight,
) => {

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    },
    'confirmed',
  );

  return { confirmed: !confirmation.value.err, signature };
};


export const executeAndConfirm = async (
  connection: Connection,
  transaction: VersionedTransaction,
  latestBlockhash: BlockhashWithExpiryBlockHeight,
): Promise<{ confirmed: boolean; signature?: string; error?: string }> => {
  logger.debug('Executing transaction...');

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    preflightCommitment: connection.commitment,
  });

  return await confirm(connection, signature, latestBlockhash);
};
function tyepof(secretKey: any): any {
  throw new Error('Function not implemented.');
}

