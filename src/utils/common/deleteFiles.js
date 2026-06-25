import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base paths
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const UPLOADS_DIR = path.join(ASSETS_DIR, 'uploads');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Default protected files that shouldn't be deleted
const PROTECTED_FILES = [
    'backgroundLogin.png',
    'logo.png',
    'default.jpg'
];

/**
 * Remove image logo from public/assets/uploads/logo directory
 * @param {string} image - Image filename to remove
 * @returns {Promise<boolean>} - Success status
 */
export const removeImageLogo = async (image) => {
    if (!image || PROTECTED_FILES.includes(image)) {
        return false;
    }
    
    try {
        const imagePath = path.join(UPLOADS_DIR, 'logo', image);
        
        if (existsSync(imagePath)) {
            await fs.unlink(imagePath);
            console.log(`✅ Logo image removed: ${image}`);
            return true;
        }
        
        console.log(`⚠️ Logo image not found: ${image}`);
        return false;
    } catch (error) {
        console.error(`❌ Error removing logo image ${image}:`, error.message);
        return false;
    }
};

/**
 * Remove uploaded file from public/assets/uploads directory
 * @param {string} filename - File name to remove
 * @param {string} type - Type directory (users, admin, etc.)
 * @param {string} [subDir] - Optional subdirectory
 * @returns {Promise<boolean>} - Success status
 */
export const removeFile = async (filename, type, subDir = null) => {
    if (!filename || !type || PROTECTED_FILES.includes(filename)) {
        return false;
    }
    
    try {
        let filePath;
        
        if (subDir) {
            filePath = path.join(UPLOADS_DIR, type, subDir, filename);
        } else {
            filePath = path.join(UPLOADS_DIR, type, filename);
        }
        
        if (existsSync(filePath)) {
            await fs.unlink(filePath);
            console.log(`✅ File removed: ${filename} from ${type}${subDir ? '/' + subDir : ''}`);
            return true;
        }
        
        console.log(`⚠️ File not found: ${filename}`);
        return false;
    } catch (error) {
        console.error(`❌ Error removing file ${filename}:`, error.message);
        return false;
    }
};

/**
 * Remove entire folder from uploads directory
 * @param {string} dir - Directory name to remove
 * @returns {Promise<boolean>} - Success status
 */
export const removeFolder = async (dir) => {
    if (!dir) {
        return false;
    }
    
    try {
        const folderPath = path.join(UPLOADS_DIR, dir);
        
        if (existsSync(folderPath)) {
            await fs.rm(folderPath, { recursive: true, force: true });
            console.log(`✅ Folder removed: ${dir}`);
            return true;
        }
        
        console.log(`⚠️ Folder not found: ${dir}`);
        return false;
    } catch (error) {
        console.error(`❌ Error removing folder ${dir}:`, error.message);
        return false;
    }
};

/**
 * Remove subfolder from uploads directory
 * @param {string} dir - Parent directory name
 * @param {string} subDir - Subdirectory name to remove
 * @returns {Promise<boolean>} - Success status
 */
export const removeSubFolder = async (dir, subDir) => {
    if (!dir || !subDir) {
        return false;
    }
    
    try {
        const subFolderPath = path.join(UPLOADS_DIR, dir, subDir);
        
        if (existsSync(subFolderPath)) {
            await fs.rm(subFolderPath, { recursive: true, force: true });
            console.log(`✅ Subfolder removed: ${dir}/${subDir}`);
            return true;
        }
        
        console.log(`⚠️ Subfolder not found: ${dir}/${subDir}`);
        return false;
    } catch (error) {
        console.error(`❌ Error removing subfolder ${dir}/${subDir}:`, error.message);
        return false;
    }
};

/**
 * Remove multiple files at once
 * @param {Array<{filename: string, type: string, subDir?: string}>} files - Array of file objects
 * Each file object should have: { filename: 'image.jpg', type: 'users', subDir: 'user123' }
 * @returns {Promise<{success: number, failed: number}>} - Results summary
 * 
 * @example
 * const filesToDelete = [
 *   { filename: 'avatar.jpg', type: 'users', subDir: 'user123' },
 *   { filename: 'banner.png', type: 'admin' },
 *   { filename: 'logo.jpg', type: 'logo' }
 * ];
 * const result = await removeMultipleFiles(filesToDelete);
 * console.log(`Success: ${result.success}, Failed: ${result.failed}`);
 */
export const removeMultipleFiles = async (files) => {
    const results = { success: 0, failed: 0 };
    
    if (!Array.isArray(files) || files.length === 0) {
        return results;
    }
    
    const promises = files.map(async (fileObj) => {
        // Destructure with default values
        const { filename, type, subDir = null } = fileObj;
        
        // Validate required properties
        if (!filename || !type) {
            console.error('❌ Invalid file object:', fileObj);
            results.failed++;
            return;
        }
        
        const success = await removeFile(filename, type, subDir);
        if (success) {
            results.success++;
        } else {
            results.failed++;
        }
    });
    
    await Promise.all(promises);
    return results;
};

/**
 * Clean up user files (remove user's upload folder)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export const cleanupUserFiles = async (userId) => {
    if (!userId) {
        return false;
    }
    
    return await removeSubFolder('users', userId);
};

/**
 * Get file info (size, exists, etc.)
 * @param {string} filename - File name
 * @param {string} type - Type directory
 * @param {string} [subDir] - Optional subdirectory
 * @returns {Promise<Object|null>} - File info or null
 */
export const getFileInfo = async (filename, type, subDir = null) => {
    if (!filename || !type) {
        return null;
    }
    
    try {
        let filePath;
        
        if (subDir) {
            filePath = path.join(UPLOADS_DIR, type, subDir, filename);
        } else {
            filePath = path.join(UPLOADS_DIR, type, filename);
        }
        
        if (existsSync(filePath)) {
            const stats = await fs.stat(filePath);
            return {
                filename,
                path: filePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                exists: true
            };
        }
        
        return { filename, exists: false };
    } catch (error) {
        console.error(`❌ Error getting file info ${filename}:`, error.message);
        return null;
    }
};

// Default export with all functions
export default {
    removeImageLogo,
    removeFile,
    removeFolder,
    removeSubFolder,
    removeMultipleFiles,
    cleanupUserFiles,
    getFileInfo
};

