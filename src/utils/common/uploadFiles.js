import path from 'path';
import { fileURLToPath } from 'url';
import deleteFiles from './deleteFiles.js';
import Resize from './resizeFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Unified function to handle all file uploads dynamically
const handleMultipleUploads = async (request, fieldsConfig) => {
    // Process all fields in parallel
    const uploadPromises = fieldsConfig.map(async (field) => {
        const { name, type, dir } = field;
        if (request.files && request.files[name]) {
            // Use the existing upload logic based on type
            return { [name]: await uploadAnyFile(request, type, dir, name) };
        }
        return { [name]: null }; // If no file, return null
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    // Combine results into a single object
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
};

// General handler for any file type
const uploadAnyFile = async (request, type, dir, name) => {
    let file = "";
    if (type === "image") {
        file = await handleUploadAnyImage(request, dir, name);
    } else if (type === "moreImage") {
        if (Array.isArray(request.files[name])) {
            file = await handleImgs(request, dir, name);
        } else {
            file = await handleUploadAnyImage(request, dir, name);
        }
    } else if (type === 'pdf') {
        file = await handleUploadPdf(request, dir, name);
    } else if (type === 'txt') {
        file = await handleUploadTxt(request, dir, name);
    } else if (type === 'audio') {
        file = await handleUploadAudio(request, dir, name);
    } else {
        file = await handleVideo(request, dir, name);
    }
    return file;
};

const handleUploadAnyImage = async (request, dir, imageName) => {
    // Define upload path
    let pathUpload = path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir);
    let fileUpload = new Resize(pathUpload);

    // Initialize image processing result
    let results = [];

    // Handle Express File Upload
    if (request.files && request.files[imageName]) {
        // Multiple images
        if (Array.isArray(request.files[imageName])) {
            for (const file of request.files[imageName]) {
                const images = await fileUpload.save(file.data, file.name);
                results.push(images);
            }
        } else { // Single image
            const image = await fileUpload.save(request.files[imageName].data, request.files[imageName].name);
            results.push(image);
        }
    }

    // Handle Multer
    else if (request.file || request.files) {
        if (Array.isArray(request.files)) {
            for (let i = 0; i < request.files.length; i++) {
                const images = await fileUpload.save(request.files[i].buffer, request.files[i].originalname);
                results.push(images);
            }
        } else { // Single image
            const image = await fileUpload.save(request.file.buffer, request.file.originalname);
            results.push(image);
        }
    }

    // Return results
    return Array.isArray(results) && results.length > 1 ? results : results[0];
};

// handle image
const handleImg = async (request, dir, subdir) => {
    let pathUpload       = (dir == "users")?path.join(__dirname,"..","..","..","public","assets","uploads",dir,subdir):path.join(__dirname,"..","..","..","public","assets","uploads",dir);
    let imagePath        = pathUpload;
    let fileUpload       = new Resize(imagePath);
    var image            = await fileUpload.save(request.file.buffer);
    return image;
}
// handle image post
const handleImgUpload = async (request, dir, subdir) => {
    let pathUpload       = (dir == "users" || dir == "chat")?path.join(__dirname,"..","..","..","public","assets","uploads",dir,subdir):path.join(__dirname,"..","..","..","public","assets","uploads",dir);
    let imagePath        = pathUpload;
    let fileUpload       = new Resize(imagePath);
    var image            = await fileUpload.save((dir == "users")?request.files.image.data:request.files.data);
    return image;
}
const handleImgUploadStore = async (request, dir, subdir, imageName) => {
    let pathUpload           = path.join(__dirname,"..","..","..","public","assets","uploads",dir,subdir);
    let imagePath            = pathUpload;
    let fileUpload           = new Resize(imagePath);
    var image                = await fileUpload.save(request.files[imageName].data);
    return image;
}

// handle images
const handleImgs = async (request, dir, name, subdir = "") => {
    try {
        // Validate if files exist in the request
        if (!request.files || !request.files[name]) {
            throw new Error("No image files provided.");
        }

        // Prepare upload path
        const pathUpload = (dir === "users" || dir === "chat")
            ? path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir, subdir || "")
            : path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir);

        // Initialize Resize instance
        const fileUpload = new Resize(pathUpload);

        // Handle files (multiple or single)
        const files = Array.isArray(request.files[name]) ? request.files[name] : [request.files[name]];

        const nameArray = [];
        for (const file of files) {
            try {
                // Resize and save each image
                const resizedImage = await fileUpload.save(file.data);
                nameArray.push(resizedImage); // Store successfully uploaded file names
            } catch (err) {
                console.error("Failed to upload image:", file.name, err);
                // Continue uploading other files even if one fails
            }
        }

        // Return all uploaded image names
        return nameArray;

    } catch (err) {
        console.error("Image upload error:", err); // Log errors
        throw new Error("Failed to upload images."); // Throw error for controller handling
    }
};

const handleVideo = async (request, dir, name) => {
    try {
        // Check if the file exists in the request
        if (!request.files || !request.files[name]) {
            throw new Error("No video file provided.");
        }

        // Get the file from the request
        const file = request.files[name];

        // Generate a unique file name
        const fileName = "video" + Math.floor(Math.random() * 100) + Date.now() + ".mp4";

        // Define the upload path
        const uploadPath = path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir, fileName);

        // Move the file to the specified upload path
        await file.mv(uploadPath);

        // Return the uploaded file name
        return fileName;

    } catch (err) {
        console.error("Video upload error:", err); // Log error for debugging

        // Throw error to be handled in the calling function
        throw new Error("Failed to upload video file");
    }
};

const handleUploadPdf = async (req, dir, name) => {
    try {
        // Get the file from request
        const file = req.files[name];

        // Generate a unique file name
        const fileName = "pdf" + Math.floor(Math.random() * 100) + Date.now() + ".pdf";

        // Define the upload path
        const uploadPath = path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir, fileName);

        // Move the file to the upload path
        await file.mv(uploadPath);

        // Return the file name if upload is successful
        return fileName;

    } catch (err) {
        console.error("File upload error:", err); // Log the error for debugging

        // Throw a specific error to handle it in higher layers
        throw new Error("Failed to upload PDF file");
    }
};

const handleUploadTxt = async (req, dir, name) => {
    try {
        // Check if the file exists in the request
        if (!req.files || !req.files[name]) {
            throw new Error("No text file provided.");
        }

        // Get the file from request
        const file = req.files[name];

        // Validate file extension (optional security check)
        const allowedExtensions = ['.txt'];
        const fileExtension = path.extname(file.name).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error("Only .txt files are allowed.");
        }

        // Generate a unique file name
        const fileName = "txt" + Math.floor(Math.random() * 100) + Date.now() + ".txt";

        // Define the upload path
        const uploadPath = path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir, fileName);

        // Move the file to the upload path
        await file.mv(uploadPath);

        // Return the file name if upload is successful
        return fileName;

    } catch (err) {
        console.error("Text file upload error:", err); // Log the error for debugging

        // Throw a specific error to handle it in higher layers
        throw new Error("Failed to upload text file");
    }
};

const handleUploadAudio = async (req, dir, name) => {
    try {
        // Check if the file exists in the request
        if (!req.files || !req.files[name]) {
            throw new Error("No audio file provided.");
        }

        // Get the file from request
        const file = req.files[name];

        // Validate file extension (security check)
        const allowedExtensions = ['.m4a', '.mp3'];
        const fileExtension = path.extname(file.name).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error("Only .m4a and .mp3 files are allowed.");
        }

        // Generate a unique file name with original extension
        const fileName = "audio" + Math.floor(Math.random() * 100) + Date.now() + fileExtension;

        // Define the upload path
        const uploadPath = path.join(__dirname, "..", "..", "..", "public", "assets", "uploads", dir, fileName);

        // Move the file to the upload path
        await file.mv(uploadPath);

        // Return the file name if upload is successful
        return fileName;

    } catch (err) {
        console.error("Audio file upload error:", err); // Log the error for debugging

        // Throw a specific error to handle it in higher layers
        throw new Error("Failed to upload audio file");
    }
};

const handleFileUpdate = async (req, fields, document, deleteType) => {
    const fieldsConfig = [];

    for (const { name, type, dir } of fields) {
        let field = req.files[name];
        if (field) {
            const existingFiles = Array.isArray(field) ? document[name] : [document[name]];
                for (const file of existingFiles) {
                    deleteFiles.removeFile(file, dir, deleteType);
                }
            fieldsConfig.push({ name, type, dir});
        }
    }

    return await handleMultipleUploads(req, fieldsConfig);
};

export default {
    handleMultipleUploads,
    uploadAnyFile,
    handleUploadAnyImage,
    handleImg,
    handleImgUpload,
    handleImgUploadStore,
    handleImgs,
    handleVideo,
    handleUploadPdf,
    handleUploadTxt,
    handleUploadAudio,
    handleFileUpdate
}