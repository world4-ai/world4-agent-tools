import { z } from "zod";
import { PubkeySchema } from "../pubkey.js";
import { AgentPublicSchema } from "./agent.js";
export const ChallengeRequestSchema = z.object({ pubkey: PubkeySchema }).strict();
export const ChallengeResponseSchema = z.object({ nonce: z.string(), message: z.string(), expiresAt: z.string() });
export const VerifyRequestSchema = z.object({ pubkey: PubkeySchema, nonce: z.string().min(1), signature: z.string().min(1) }).strict();
export const VerifyResponseSchema = z.object({ token: z.string(), agent: AgentPublicSchema });
export type ChallengeRequest = z.infer<typeof ChallengeRequestSchema>;
export type ChallengeResponse = z.infer<typeof ChallengeResponseSchema>;
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;
export function buildSignInMessage(p: { pubkey: string; nonce: string; issuedAt: string }): string {
  return ["AgentArea wants you to sign in.", "Domain: AgentArea", "Chain ID: 1", `Address: ${p.pubkey}`, `Nonce: ${p.nonce}`, `Issued At: ${p.issuedAt}`].join("\n");
}
