import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import RequestModel from "./requestModel";
import { AuthRequest } from "../middlewares/authenticate"; // assuming you have this type
import PdfModel from "../pdf/pdfModel";
import path from "node:path";
import cloudinary from "../config/cloudinary";
import fs from "node:fs";
import { timeStamp } from "node:console";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createDeleteRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        await sleep(5000);

        const _req = req as AuthRequest;
        const { pdfId, type } = req.body;

        if (!pdfId) {
            return next(
                createHttpError(400, "Missing 'pdfId' in request body")
            );
        }

        if (type !== "DELETE") {
            return next(createHttpError(400, "Invalid 'type'"));
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

        // ❗️ Check if a request for this pdfId already exists
        const existingRequest = await RequestModel.findOne({
            pdfId,
            status: "PENDING",
        });

        if (existingRequest) {
            return next(
                createHttpError(
                    409,
                    "A request for this PDF already exists. Please wait for it to be processed."
                )
            );
        }

        // Create the request
        const newRequest = await RequestModel.create({
            userId: _req.userId,
            pdfId,
            type: "DELETE",
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
        const { status } = req.body; // Expect status to bpassed in the body
        const { requestId } = req.params; // Get requestId from the URL parameter
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
//get all user requests api

export const listAllRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const totalRequests = await RequestModel.countDocuments();

        const requests = await RequestModel.find()
            .populate("userId", "name") // Populate user name
            .populate("pdfId", "title") // Populate pdf title (assuming your Pdf model has a 'title' field)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            data: requests,
            pagination: {
                total: totalRequests,
                page,
                limit,
                totalPages: Math.ceil(totalRequests / limit),
            },
        });
    } catch (err) {
        console.error(err);
        return next(createHttpError(500, "Error while getting requests"));
    }
};

//create edit request api
export const createEditRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { pdfId, newDate, type } = req.body;
        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };
        const _req = req as AuthRequest;

        if (!pdfId) {
            return next(
                createHttpError(400, "Missing 'pdfId' in request body")
            );
        }

        if (typeof type !== "string" || type.trim().toUpperCase() !== "EDIT") {
            return next(createHttpError(400, "Invalid 'type'."));
        }

        if (
            !newDate &&
            (!files || !files.newFile || files.newFile.length === 0)
        ) {
            return next(
                createHttpError(
                    400,
                    "At least one of 'newDate' or 'newFile' must be provided"
                )
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
                    "You are not authorized to request edit for this PDF"
                )
            );
        }

        // Optional: Check for existing active edit request
        const existingRequest = await RequestModel.findOne({
            pdfId,
            type: "EDIT",
            status: "PENDING",
        });

        if (existingRequest) {
            return next(
                createHttpError(
                    409,
                    "An edit request for this PDF already exists. Please wait for it to be processed."
                )
            );
        }

        // Upload file to Cloudinary if a new file was provided
        let newFileUrl: string | undefined;

        if (files && files.newFile && files.newFile[0]) {
            const uploadedFile = files.newFile[0];
            const filePath = path.resolve(
                __dirname,
                "../../public/data/uploads",
                uploadedFile.filename
            );

            const cloudinaryResult = await cloudinary.uploader.upload(
                filePath,
                {
                    resource_type: "raw",
                    filename_override: uploadedFile.filename,
                    folder: "pdf-pdfs",
                    format: "pdf",
                }
            );

            newFileUrl = cloudinaryResult.secure_url;

            // Clean up local file
            await fs.promises.unlink(filePath);
        }

        // Create edit request document
        const newRequest = await RequestModel.create({
            userId: _req.userId,
            pdfId,
            type: "EDIT",
            newDate,
            newFile: newFileUrl,
            status: "PENDING",
        });

        return res.status(201).json({
            id: newRequest._id,
            message: "Edit request submitted successfully",
        });
    } catch (err) {
        console.error("Error creating edit request:", err);
        return next(
            createHttpError(
                500,
                (err as Error).message || "Failed to create edit request"
            )
        );
    }
};

//editrequeststatus api

// export const editRequestStatus = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     const { status } = req.body as { status: "APPROVED" | "CANCELLED" };
//     const { requestId } = req.params;

//     if (!["APPROVED", "CANCELLED"].includes(status)) {
//         return next(createHttpError(400, "Invalid status value"));
//     }

//     try {
//         const requestDoc = await RequestModel.findById(requestId);
//         if (!requestDoc) {
//             return next(createHttpError(404, "Request not found"));
//         }

//         if (requestDoc.type !== "EDIT") {
//             return next(
//                 createHttpError(400, "Only edit requests can be updated")
//             );
//         }
//         if (requestDoc.status !== "PENDING") {
//             return next(
//                 createHttpError(400, "Only PENDING requests can be updated")
//             );
//         }

//         if (status === "APPROVED") {
//             const pdf = await PdfModel.findById(requestDoc.pdfId);
//             if (!pdf) {
//                 return next(createHttpError(404, "Associated PDF not found"));
//             }

//             const updatePayload: any = {};

//             if (requestDoc.newFile) {
//                 updatePayload.file = requestDoc.newFile;
//             }

//             if (requestDoc.newDate) {
//                 updatePayload.createdAt = requestDoc.newDate;
//             }
//             console.log("Update payload:", updatePayload);

//             // Update PDF document
//             const updatedPdf = await PdfModel.findByIdAndUpdate(
//                 requestDoc.pdfId,
//                 updatePayload,
//                 { new: true } // This returns the updated document
//             );

//             if (!updatedPdf) {
//                 return next(createHttpError(500, "Failed to update PDF"));
//             }

//             // Update request status to APPROVED
//             requestDoc.status = "APPROVED";
//             await requestDoc.save();

//             return res.status(200).json({
//                 message: "Request approved and PDF updated.",
//                 updatedPdf,
//             });
//         } else {
//             // status === "CANCELLED"
//             requestDoc.status = "CANCELLED";
//             await requestDoc.save();

//             return res.status(200).json({ message: "Request cancelled." });
//         }
//     } catch (err) {
//         console.error("Error in editRequestStatus:", err);
//         return next(createHttpError(500, "Something went wrong"));
//     }
// };

export const editRequestStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { status } = req.body as { status: "APPROVED" | "CANCELLED" };
    const { requestId } = req.params;

    if (!["APPROVED", "CANCELLED"].includes(status)) {
        return next(createHttpError(400, "Invalid status value"));
    }

    try {
        const requestDoc = await RequestModel.findById(requestId);
        if (!requestDoc) {
            return next(createHttpError(404, "Request not found"));
        }

        if (requestDoc.type !== "EDIT") {
            return next(
                createHttpError(400, "Only edit requests can be updated")
            );
        }

        if (requestDoc.status !== "PENDING") {
            return next(
                createHttpError(400, "Only PENDING requests can be updated")
            );
        }

        if (status === "APPROVED") {
            const pdf = await PdfModel.findById(requestDoc.pdfId);
            if (!pdf) {
                return next(createHttpError(404, "Associated PDF not found"));
            }

            // Apply edits
            if (requestDoc.newFile) {
                pdf.file = requestDoc.newFile;
            }

            if (requestDoc.newDate) {
                pdf.date = requestDoc.newDate;
            }

            await pdf.save();

            // Mark request as approved
            requestDoc.status = "APPROVED";
            await requestDoc.save();

            return res.status(200).json({
                message: "Request approved and PDF updated.",
                updatedPdf: pdf,
            });
        } else {
            // Handle cancellation
            requestDoc.status = "CANCELLED";
            await requestDoc.save();

            return res.status(200).json({ message: "Request cancelled." });
        }
    } catch (err) {
        console.error("Error in editRequestStatus:", err);
        return next(createHttpError(500, "Something went wrong"));
    }
};
