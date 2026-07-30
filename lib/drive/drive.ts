// ============================================================
// DailyLedger — lib/drive/drive.ts
// Authentic Google Drive API v3 helper for folder creation & encrypted backup
// ============================================================

import { getDB, getSetting, setSetting } from '@/lib/db/dexie';
import { encryptData, decryptData, createBackupEnvelope } from '@/lib/encryption/crypto';
import { validateBackupPayload } from '@/lib/backup/schema';
import { txRepo } from '@/lib/db/transactions.repository';

export const DRIVE_FOLDER_NAME = 'DailyLedger_Backups';
export const MAX_BACKUP_VERSIONS = 5;

export interface DriveFileInfo {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

/**
 * Searches for or creates the "DailyLedger_Backups" folder in Google Drive.
 */
export async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Valid Google Drive access token is required');
  }

  // Search for existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create DailyLedger_Backups folder in Google Drive');
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads an encrypted backup file to the DailyLedger_Backups folder in Google Drive.
 */
export async function uploadBackupToDrive(
  accessToken: string,
  folderId: string,
  encryptedBuffer: ArrayBuffer,
  fileName: string
): Promise<DriveFileInfo> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Valid Google Drive authorization is required for backups');
  }

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/octet-stream',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([encryptedBuffer], { type: 'application/octet-stream' }));

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size';
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Failed to upload backup file to Google Drive: ${response.status} ${errText}`);
  }

  return response.json();
}

/**
 * Lists all backup files in the DailyLedger_Backups folder, ordered newest first.
 */
export async function listDriveBackups(accessToken: string, folderId: string): Promise<DriveFileInfo[]> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Valid Google Drive authorization is required');
  }

  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to list backups from Google Drive');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Enforces 5-version backup retention in Google Drive.
 * Deletes older backup files after a new backup has been successfully uploaded and verified.
 */
export async function enforceDriveBackupRetention(accessToken: string, folderId: string): Promise<void> {
  try {
    const backups = await listDriveBackups(accessToken, folderId);
    if (backups.length > MAX_BACKUP_VERSIONS) {
      const toDelete = backups.slice(MAX_BACKUP_VERSIONS);
      for (const file of toDelete) {
        await deleteDriveBackupFile(accessToken, file.id).catch((err) => {
          console.warn(`Failed to prune old backup file ${file.id}:`, err);
        });
      }
    }
  } catch (err) {
    console.warn('Backup retention cleanup encountered an error:', err);
  }
}

/**
 * Performs authentic encrypted sync of local IndexedDB data to Google Drive.
 * Requires user passphrase. No plaintext key is stored in IndexedDB.
 */
export async function performAutoDriveSync(
  accessToken: string,
  passphrase: string
): Promise<{ fileId: string; lastBackupAt: string; fileName: string; size?: string }> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Google Drive account is not connected. Please connect Google Drive in Account settings.');
  }
  if (!passphrase || passphrase.trim().length < 12) {
    throw new Error('Encryption passphrase must be at least 12 characters');
  }

  const db = getDB();
  const allTxns = await db.transactions.toArray();
  const allSettings = await db.settings.toArray();

  const payload = createBackupEnvelope(allTxns, allSettings);
  const encrypted = await encryptData(payload, passphrase);

  // 1. Get or create folder
  const folderId = await getOrCreateDriveFolder(accessToken);

  // 2. Upload using timestamped filename
  const fileName = `dailyledger_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.dlb`;
  const fileInfo = await uploadBackupToDrive(accessToken, folderId, encrypted, fileName);

  const nowISO = new Date().toISOString();

  // 3. Save sync state locally upon verified upload response
  const driveConfig = (await getSetting<Record<string, unknown>>('driveConfig')) || {};
  await setSetting('driveConfig', {
    ...driveConfig,
    connected: true,
    folderId,
    folderName: DRIVE_FOLDER_NAME,
    lastBackupAt: nowISO,
    fileId: fileInfo.id,
    lastFileName: fileName,
    lastFileSize: fileInfo.size,
  });

  // 4. Enforce retention (keep latest 5 versions, delete older) AFTER new backup is confirmed
  await enforceDriveBackupRetention(accessToken, folderId);

  return {
    fileId: fileInfo.id,
    lastBackupAt: nowISO,
    fileName,
    size: fileInfo.size,
  };
}

/**
 * Downloads a raw binary backup file from Google Drive by file ID.
 */
export async function downloadDriveFile(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Valid Google Drive authorization is required to download backup');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download backup file from Google Drive');
  }

  return res.arrayBuffer();
}

/**
 * Downloads, decrypts, schema-validates, and restores a Google Drive backup into IndexedDB atomically.
 */
export async function downloadAndDecryptDriveBackup(
  accessToken: string,
  fileId: string,
  passphrase: string
): Promise<void> {
  const buffer = await downloadDriveFile(accessToken, fileId);
  const decrypted = await decryptData(buffer, passphrase);
  const data = JSON.parse(decrypted);

  const validation = validateBackupPayload(data);
  if (!validation.valid) {
    throw new Error(`Backup validation failed: ${validation.issues.join('; ')}`);
  }

  await txRepo.atomicRestore(data.transactions, data.settings);
}

/**
 * Deletes a file from Google Drive by file ID.
 */
export async function deleteDriveBackupFile(accessToken: string, fileId: string): Promise<void> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Valid Google Drive authorization is required to delete file');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to delete file from Google Drive');
  }
}
