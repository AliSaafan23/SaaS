import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsRoot = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'uploads');

/** Ensure public/assets/uploads/<dir> exists; returns absolute path. */
export default (dir) => {
    const uploadPath = path.join(uploadsRoot, dir);
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    return uploadPath;
};

/** Create all standard upload folders at server boot (Railway / fresh deploy). */
export const ensureUploadDirs = (dirs = ['customers', 'tenants', 'users', 'admin']) => {
    if (!fs.existsSync(uploadsRoot)) {
        fs.mkdirSync(uploadsRoot, { recursive: true });
    }
    for (const dir of dirs) {
        const p = path.join(uploadsRoot, dir);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    }
};
