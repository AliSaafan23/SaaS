import makeDir from '../../../utils/common/makeDir.js';
import uploadFiles from '../../../utils/common/uploadFiles.js';
import deleteFiles from '../../../utils/common/deleteFiles.js';

export const saveProductImage = async (req, fieldName = 'image') => {
    if (!req.files?.[fieldName]) return null;
    makeDir('products');
    return uploadFiles.handleUploadAnyImage(req, 'products', fieldName);
};

export const removeProductImage = async (filename) => {
    if (!filename) return;
    await deleteFiles.removeFile('products', filename);
};

export default { saveProductImage, removeProductImage };
