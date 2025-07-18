import * as storageManager from './core/storage.manager';

export const storageService = {
  upload: storageManager.upload,
  uploadUserFile: storageManager.uploadUserFile,
  uploadProjectFile: storageManager.uploadProjectFile,
  download: storageManager.download,
  delete: storageManager.del,
  deleteMany: storageManager.deleteMany,
  deleteUserFiles: storageManager.deleteUserFiles,
  deleteProjectFiles: storageManager.deleteProjectFiles,
  exists: storageManager.exists,
  list: storageManager.list,
  getSignedUrl: storageManager.getSignedUrl,
  getPublicUrl: storageManager.getPublicUrl,
  copy: storageManager.copy,
  move: storageManager.move,
  validateFile: storageManager.validate,
  getUserStorageUsage: storageManager.getUserStorageUsage,
  getProjectStorageUsage: storageManager.getProjectStorageUsage,
};
