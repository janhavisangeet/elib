import mongoose from "mongoose";

export interface RequestType {
    status: "PENDING" | "APPROVED" | "CANCELLED";
    newDate: Date | null;
    newFile: string | null;
    userId: mongoose.Types.ObjectId;
    pdfId: mongoose.Types.ObjectId;
    type: "EDIT" | "DELETE";
}
