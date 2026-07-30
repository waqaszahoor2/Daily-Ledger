// ============================================================
// DailyLedger — lib/backup/schema.ts
// Zod schema for validating encrypted backup payloads.
// Used during restore to prevent accepting corrupted or
// maliciously crafted backup files.
// ============================================================

import { z } from 'zod';

// ─── Transaction schema ───────────────────────────────────────────────────────

export const TransactionSchema = z.object({
  id: z.string().min(1).max(128),
  userId: z.string().optional(), // legacy field — allowed but ignored after migration
  type: z.enum(['income', 'expense', 'money_given', 'money_received']),
  amount: z.number().int().nonnegative().max(1_000_000_000_00), // max 10M in minor units
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().optional(),
  categoryId: z.string().min(1).max(64),
  personName: z.string().max(256).optional(),
  notes: z.string().max(2048).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).strict();

// ─── Settings record schema ────────────────────────────────────────────────────

export const SettingRecordSchema = z.object({
  key: z.string().min(1).max(128),
  value: z.unknown(),
});

// ─── Backup envelope (v1 — legacy unencrypted JSON) ──────────────────────────

export const LegacyBackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  transactions: z.array(TransactionSchema),
  settings: z.array(SettingRecordSchema).optional(),
});

// ─── Backup envelope (v2 — encrypted .dlb with versioned header) ─────────────
// After decryption, the plaintext JSON must match this schema.

export const BackupPayloadSchema = z.object({
  format: z.literal('DailyLedger-Backup'),
  version: z.number().int().min(2),
  appVersion: z.string().optional(),
  exportedAt: z.string(),
  recordCount: z.number().int().nonnegative(),
  transactions: z.array(TransactionSchema),
  settings: z.array(SettingRecordSchema).optional(),
});

// ─── Validation helpers ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  recordCount?: number;
  exportedAt?: string;
}

function checkDuplicateIds(transactions: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const tx of transactions) {
    if (seen.has(tx.id)) {
      dupes.push(tx.id);
    }
    seen.add(tx.id);
  }
  return dupes;
}

/**
 * Validates a decrypted backup payload JSON object.
 * Returns a structured result with issues and metadata.
 */
export function validateBackupPayload(data: unknown): ValidationResult {
  // Try v2 format first
  const v2 = BackupPayloadSchema.safeParse(data);
  if (v2.success) {
    const dupes = checkDuplicateIds(v2.data.transactions);
    if (dupes.length > 0) {
      return {
        valid: false,
        issues: [`Duplicate transaction IDs found: ${dupes.slice(0, 5).join(', ')}`],
      };
    }

    if (v2.data.recordCount !== v2.data.transactions.length) {
      return {
        valid: false,
        issues: [
          `Record count mismatch: header says ${v2.data.recordCount}, ` +
          `but ${v2.data.transactions.length} transactions found`,
        ],
      };
    }

    return {
      valid: true,
      issues: [],
      recordCount: v2.data.transactions.length,
      exportedAt: v2.data.exportedAt,
    };
  }

  // Try v1 legacy format
  const v1 = LegacyBackupSchema.safeParse(data);
  if (v1.success) {
    const dupes = checkDuplicateIds(v1.data.transactions);
    if (dupes.length > 0) {
      return {
        valid: false,
        issues: [`Duplicate transaction IDs found: ${dupes.slice(0, 5).join(', ')}`],
      };
    }
    return {
      valid: true,
      issues: [],
      recordCount: v1.data.transactions.length,
      exportedAt: v1.data.exportedAt,
    };
  }

  // Both failed — return combined issues
  const issues = v2.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).slice(0, 10);
  return { valid: false, issues };
}

/**
 * Validates passphrase strength.
 * Returns { valid, issues } so the UI can display specific guidance.
 */
export function validatePassphrase(passphrase: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (passphrase.length < 12) issues.push('Must be at least 12 characters');
  if (!/[A-Z]/.test(passphrase)) issues.push('Add at least one uppercase letter');
  if (!/[a-z]/.test(passphrase)) issues.push('Add at least one lowercase letter');
  if (!/[0-9]/.test(passphrase)) issues.push('Add at least one number');
  return { valid: issues.length === 0, issues };
}
