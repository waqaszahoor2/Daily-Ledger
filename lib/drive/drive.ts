// ============================================================
// DailyLedger — lib/drive/drive.ts
// Authentic Google Drive API v3 helper for folder creation & encrypted backup
// ============================================================

import { getDB, getSetting, setSetting } from '@/lib/db/dexie';
import { encryptData, decryptData, generateSecureRecoveryKey } from '@/lib/encryption/crypto';
import { txRepo } from '@/lib/db/transactions.repository';

export const DRIVE_FOLDER_NAME = 'DailyLedger_Backups';

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
 * Lists all backup files in the DailyLedger_Backups folder.
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
 * Gets or creates the CSPRNG encryption recovery passphrase for drive backups (H-02).
 */
export async function getOrCreateDrivePassphrase(): Promise<string> {
  let pass = await getSetting<string>('drive_passphrase');
  if (!pass) {
    pass = generateSecureRecoveryKey();
    await setSetting('drive_passphrase', pass);
  }
  return pass;
}

/**
 * Performs authentic encrypted sync of local IndexedDB data to Google Drive.
 */
export async function performAutoDriveSync(accessToken: string): Promise<{ fileId: string; lastBackupAt: string }> {
  if (!accessToken || accessToken === 'demo-access-token') {
    throw new Error('Google Drive account is not connected. Please connect Google Drive in Account settings.');
  }

  const db = getDB();
  const allTxns = await db.transactions.toArray();
  const allSettings = await db.settings.toArray();

  const payload = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: allTxns,
    settings: allSettings,
  });

  const passphrase = await getOrCreateDrivePassphrase();
  const encrypted = await encryptData(payload, passphrase);

  // Get or create folder
  const folderId = await getOrCreateDriveFolder(accessToken);

  // Upload file
  const fileName = `dailyledger_autobackup_${new Date().toISOString().replace(/[:.]/g, '-')}.dlb`;
  const fileInfo = await uploadBackupToDrive(accessToken, folderId, encrypted, fileName);

  const nowISO = new Date().toISOString();

  // Save sync state locally upon verified response
  const driveConfig = (await getSetting<Record<string, unknown>>('driveConfig')) || {};
  await setSetting('driveConfig', {
    ...driveConfig,
    connected: true,
    folderId,
    folderName: DRIVE_FOLDER_NAME,
    lastBackupAt: nowISO,
    fileId: fileInfo.id,
  });

  return {
    fileId: fileInfo.id,
    lastBackupAt: nowISO,
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

  if (!data || typeof data !== 'object' || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file schema structure');
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
