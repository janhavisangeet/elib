import mongoose, { Document, Schema } from "mongoose";
import { RequestType } from "./requestTypes";

export interface Request extends RequestType, Document {}

const requestSchema = new Schema<Request>(
    {
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "CANCELLED"],
            default: "PENDING",
            required: true,
        },
        type: {
            type: String,
            enum: ["EDIT", "DELETE"],
            default: "EDIT",
            required: true,
        },
        newDate: {
            type: Date,
            default: null,
        },
        newFile: {
            type: String,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        pdfId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pdf",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<Request>("Request", requestSchema);
