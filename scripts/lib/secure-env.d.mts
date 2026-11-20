export declare const REPO_ROOT: string
export declare function secureEnvDir(): string
export declare function encryptedEnvPath(): string
export declare function plaintextEnvPath(): string
export declare function legacyEnvPath(): string
export declare function encryptText(text: string): string
export declare function decryptText(blob: string): string
export declare function parseEnv(text: string): Record<string, string>
export declare function loadSecureEnv(): Record<string, string>
export declare function writePlaintext(text: string): void
export declare function writeEncrypted(text: string): void
export declare function removePlaintext(): void
export declare function removeLegacyFile(): void
export declare function envStatus(): {
  secureDir: string
  encrypted: boolean
  plaintextUnlocked: boolean
  legacyRepoFile: boolean
}
