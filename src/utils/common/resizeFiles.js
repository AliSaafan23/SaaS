import sharp from 'sharp';
import path from 'path';


class Resize {
    constructor(folder) {
        this.folder = folder;
    }
    async save(buffer, name) {

        const filename = Resize.filename(name);

        const filepath = this.filepath(filename);

        //  sharp.cache({ files    : 0 });

        sharp.cache(false);

        await sharp(buffer)
        .withMetadata({orientation: 1})
        .resize(450, 400, {
            kernel: sharp.kernel.lanczos2,
            fit: sharp.fit.inside,
            withoutEnlargement: true
        })
        .rotate()
        .toFile(filepath);
        return filename;
    }

    static filename(name) {
        return (name === 'logo' || name === 'backgroundLogin') ? name + ".png" : "image" + Math.floor(Math.random() * 100) + Date.now() + ".png";
    }

    filepath(filename) {
        return path.resolve(`${this.folder}/${filename}`);
    }

}
export default Resize;