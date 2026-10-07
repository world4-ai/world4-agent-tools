import { getAddress, isAddress } from "ethers";
import { z } from "zod";

export function isValidPubkey(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value) && isAddress(value);
}
export const PubkeySchema = z.string().refine(isValidPubkey, "invalid Ethereum address").transform(getAddress);
