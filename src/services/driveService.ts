import { getAccessToken } from './authService';
import { StorageData } from './storageService';

/**
 * Creates or finds a dedicated folder in Google Drive for BF Finance OS backups
 */
async function getOrCreateBackupFolder(token: string): Promise<string> {
  const folderName = 'Barbosa Fernandes - BF Finance OS Backups';

  // Search if folder exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Não foi possível criar pasta de backup no Google Drive');
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads a full backup snapshot of the system to Google Drive
 */
export async function uploadBackupToDrive(
  data: StorageData
): Promise<{ fileId: string; fileName: string; webViewLink?: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Não autenticado com Google Drive');

  const folderId = await getOrCreateBackupFolder(token);

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19);
  const fileName = `BF_Finance_OS_Backup_${timestamp}.json`;

  const fileContent = JSON.stringify(data, null, 2);

  // Multipart upload for Drive file creation with metadata + content
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`Erro ao enviar backup para Google Drive: ${err.error?.message || uploadRes.statusText}`);
  }

  const result = await uploadRes.json();
  return {
    fileId: result.id,
    fileName: result.name,
    webViewLink: result.webViewLink,
  };
}
