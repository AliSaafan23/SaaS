import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir), {
            recursive: true
        });
        return dir;
    }
};
