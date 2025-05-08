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
        // createdAt: {
        //     type: Date,
        //     required: true,
        // },
        date: {
            type: Date,
            required: true,
        },
        valid: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<Pdf>("Pdf", pdfSchema);
