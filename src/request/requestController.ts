import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import RequestModel from "./requestModel";
import { AuthRequest } from "../middlewares/authenticate"; // assuming you have this type
import PdfModel from "../pdf/pdfModel";

export const createRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const _req = req as AuthRequest;
        const { pdfId } = req.body;

        if (!pdfId) {
            return next(
                createHttpError(400, "Missing 'pdfId' in request body")
            );
        }

        if (!mongoose.Types.ObjectId.isValid(pdfId)) {
            return next(createHttpError(400, "Invalid 'pdfId' format"));
        }

        // Check if the PDF exists and belongs to the user
        const pdf = await PdfModel.findById(pdfId);

        if (!pdf) {
            return next(createHttpError(404, "PDF not found"));
        }

        if (pdf.user.toString() !== _req.userId) {
            return next(
                createHttpError(
                    403,
                    "You are not authorized to request for this PDF"
                )
            );
        }

        // Create the request
        const newRequest = await RequestModel.create({
            userId: _req.userId,
            pdfId,
            status: "PENDING", // optional, default can be set in the schema
        });

        res.status(201).json({
            id: newRequest._id,
            message: "Request created successfully",
        });
    } catch (err) {
        console.error("Error creating request:", err);
        return next(
            createHttpError(
                500,
                (err as Error).message || "Failed to create request"
            )
        );
    }
};
//admin delete request api
export const deleteRequestStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { status, requestId } = req.body;

        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            return next(
                createHttpError(400, "Invalid or missing 'requestId'.")
            );
        }

        if (status !== "APPROVED" && status !== "CANCELLED") {
            return next(
                createHttpError(
                    400,
                    "Status must be either 'APPROVED' or 'CANCELLED'."
                )
            );
        }

        // Find the request
        const requestDoc = await RequestModel.findById(requestId);
        if (!requestDoc) {
            return next(createHttpError(404, "Request not found."));
        }

        // If approved, set pdf.valid = false
        if (status === "APPROVED") {
            const updatedPdf = await PdfModel.findByIdAndUpdate(
                requestDoc.pdfId,
                { valid: false },
                { new: true } // returns the updated document
            );

            if (!updatedPdf) {
                return next(createHttpError(404, "Associated PDF not found."));
            }
        }

        // Update status
        requestDoc.status = status;
        await requestDoc.save();

        res.status(200).json({
            message: `Request ${status.toLowerCase()} successfully.`,
        });
    } catch (err) {
        console.error("Error updating request status:", err);
        return next(
            createHttpError(
                500,
                (err as Error).message || "Failed to update request status."
            )
        );
    }
};
