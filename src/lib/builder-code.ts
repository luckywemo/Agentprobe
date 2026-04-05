import { toHex } from 'viem';

/**
 * Base Builder Code for AgentProbe (ERC-8021).
 * This code is appended to all onchain transaction calldata for attribution.
 * Register/manage at https://base.dev
 */
export const BUILDER_CODE = 'bc_3928bnr7';

/**
 * Generate the ERC-8021 data suffix for Base Builder Codes.
 * The suffix is the builder code encoded as UTF-8 hex bytes,
 * appended to the end of transaction calldata.
 */
export function getBuilderCodeSuffix(): `0x${string}` {
    return toHex(BUILDER_CODE);
}

/**
 * The pre-computed data suffix for use in viem's `dataSuffix` parameter.
 * Pass this to `createWalletClient` or individual transaction calls.
 */
export const BUILDER_DATA_SUFFIX = getBuilderCodeSuffix();
