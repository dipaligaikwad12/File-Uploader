
import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer } from "file-type";

import {
    S3Client,
    PutObjectCommand
} from "@aws-sdk/client-s3";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const s3 = new S3Client({
    region: process.env.AWS_REGION
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

app.use(express.static("public"));

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a file."
            });
        }

        const detected = await fileTypeFromBuffer(req.file.buffer);

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (!detected || !allowedTypes.includes(detected.mime)) {
            return res.status(400).json({
                message: "Only JPG, PNG and PDF files are allowed."
            });
        }

        const fileName = `${randomUUID()}.${detected.ext}`;
        const key = `uploads/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: detected.mime,
            ContentDisposition: "attachment",
            ServerSideEncryption: "AES256"
        });

        await s3.send(command);

        res.status(200).json({
            message: "File uploaded successfully to AWS S3!",
            fileName: fileName
        });

    } catch (error) {
        console.error("S3 Upload Error:", error);

        res.status(500).json({
            message: "Upload failed. Check AWS configuration and permissions."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
