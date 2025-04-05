import mongoose from "mongoose";
import { Pdf } from "./pdfTypes";

const pdfSchema = new mongoose.Schema<Pdf>(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        file: {
            type: String,
            required: true,
        },
        month: {
            type: String,
            enum: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ],
            required: true,
        },
        year: {
            type: Number,
            min: 1900,
            max: new Date().getFullYear(),
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<Pdf>("Pdf", pdfSchema);
