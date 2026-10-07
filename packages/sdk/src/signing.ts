import { Wallet, hexlify } from "ethers";

export function keypairFromSecret(secret: Uint8Array | string): Wallet {
  const value = typeof secret === "string" ? secret : hexlify(secret);
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error("private key must be 32 bytes encoded as 0x-prefixed hex");
  return new Wallet(value);
}
export function signMessage(wallet: Wallet, message: string): Promise<string> {
  return wallet.signMessage(message);
}
