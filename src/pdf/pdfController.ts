import path from "node:path";
import fs from "node:fs";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import pdfModel from "./pdfModel";
import { AuthRequest } from "../middlewares/authenticate";
import { startOfDay, endOfDay } from "date-fns";

const createPdf = async (req: Request, res: Response, next: NextFunction) => {
    const { createdAt } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    try {
        const pdfFileName = files.file[0].filename;
        const pdfFilePath = path.resolve(
            __dirname,
            "../../public/data/uploads",
            pdfFileName
        );

        const pdfFileUploadResult = await cloudinary.uploader.upload(
            pdfFilePath,
            {
                resource_type: "raw",
                filename_override: pdfFileName,
                folder: "pdf-pdfs",
                format: "pdf",
            }
        );
        const _req = req as AuthRequest;

        const newPdf = await pdfModel.create({
            createdAt: createdAt,
            user: _req.userId,
            file: pdfFileUploadResult.secure_url,
        });

        // Delete temp.files
        // todo: wrap in try catch...
        await fs.promises.unlink(pdfFilePath);

        res.status(201).json({ id: newPdf._id });
    } catch (err) {
        console.error("Error uploading PDF:", err);
        return next(
            createHttpError(500, (err as Error).message || "Upload failed")
        );
    }
};

const updatePdf = async (req: Request, res: Response, next: NextFunction) => {
    //const { title, description, genre } = req.body;
    const pdfId = req.params.pdfId;

    const pdf = await pdfModel.findOne({ _id: pdfId });

    if (!pdf) {
        return next(createHttpError(404, "Pdf not found"));
    }
    // Check access
    const _req = req as AuthRequest;
    if (pdf.user.toString() !== _req.userId) {
        return next(createHttpError(403, "You can not update others pdf."));
    }

    // check if image field is exists.

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // let completeCoverImage = "";
    // if (files.coverImage) {
    //     const filename = files.coverImage[0].filename;
    //     const converMimeType = files.coverImage[0].mimetype.split("/").at(-1);
    //     // send files to cloudinary
    //     const filePath = path.resolve(
    //         __dirname,
    //         "../../public/data/uploads/" + filename
    //     );
    //     completeCoverImage = filename;
    //     const uploadResult = await cloudinary.uploader.upload(filePath, {
    //         filename_override: completeCoverImage,
    //         folder: "pdf-covers",
    //         format: converMimeType,
    //     });

    //     completeCoverImage = uploadResult.secure_url;
    //     await fs.promises.unlink(filePath);
    // }

    // check if file field is exists.
    let completeFileName = "";
    if (files.file) {
        const pdfFilePath = path.resolve(
            __dirname,
            "../../public/data/uploads/" + files.file[0].filename
        );

        const pdfFileName = files.file[0].filename;
        completeFileName = pdfFileName;

        const uploadResultPdf = await cloudinary.uploader.upload(pdfFilePath, {
            resource_type: "raw",
            filename_override: completeFileName,
            folder: "pdf-pdfs",
            format: "pdf",
        });

        completeFileName = uploadResultPdf.secure_url;
        await fs.promises.unlink(pdfFilePath);
    }

    const updatedPdf = await pdfModel.findOneAndUpdate(
        {
            _id: pdfId,
        },
        {
            // title: title,
            // description: description,
            // genre: genre,
            // coverImage: completeCoverImage
            //     ? completeCoverImage
            //     : pdf.coverImage,
            file: completeFileName ? completeFileName : pdf.file,
        },
        { new: true }
    );

    res.json(updatedPdf);
};

// Provides pdfs for particular user
// const listPdfs = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         // Extract query parameters
//         const page = parseInt(req.query.page as string) || 1;
//         const limit = parseInt(req.query.limit as string) || 10;
//         const month = req.query.month as string | undefined;
//         const year = req.query.year ? parseInt(req.query.year as string) : undefined;

//         const filters: Record<string, any> = {};

//         // Optional filters
//         if (month) {
//             filters.month = month;
//         }

//         if (year) {
//             filters.year = year;
//         }

//         const _req = req as AuthRequest;
//         if(_req.userId){
//             console.log(_req.userId)
//             filters.user = _req.userId;
//         }

//         const totalPdfs = await pdfModel.countDocuments(filters);

//         const pdfs = await pdfModel
//             .find(filters)
//             .populate('user', 'name')
//             .sort({ createdAt: -1 })
//             .skip((page - 1) * limit)
//             .limit(limit);

//         res.json({
//             data: pdfs,
//             pagination: {
//                 total: totalPdfs,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(totalPdfs / limit),
//             },
//         });
//     } catch (err) {
//         console.error(err);
//         return next(createHttpError(500, 'Error while getting PDFs'));
//     }
// };

// Provides pdfs of all users
// const listAllPdfs = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         // Extract query parameters
//         const page = parseInt(req.query.page as string) || 1;
//         const limit = parseInt(req.query.limit as string) || 10;
//         const month = req.query.month as string | undefined;
//         const year = req.query.year ? parseInt(req.query.year as string) : undefined;

//         const filters: Record<string, any> = {};

//         // Optional filters
//         if (month) {
//             filters.month = month;
//         }

//         if (year) {
//             filters.year = year;
//         }

//         const totalPdfs = await pdfModel.countDocuments(filters);

//         const pdfs = await pdfModel
//             .find(filters)
//             .populate('user', 'name')
//             .sort({ createdAt: -1 })
//             .skip((page - 1) * limit)
//             .limit(limit);

//         res.json({
//             data: pdfs,
//             pagination: {
//                 total: totalPdfs,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(totalPdfs / limit),
//             },
//         });
//     } catch (err) {
//         console.error(err);
//         return next(createHttpError(500, 'Error while getting PDFs'));
//     }
// };

// Provides PDFs for a particular user
const listPdfs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const dateString = req.query.date as string | undefined;

        const filters: Record<string, any> = {};

        // Filter by specific date (full day range)
        if (dateString) {
            const date = new Date(dateString);
            filters.createdAt = {
                $gte: startOfDay(date),
                $lte: endOfDay(date),
            };
        }

        const _req = req as AuthRequest;
        if (_req.userId) {
            filters.user = _req.userId;
        }

        const totalPdfs = await pdfModel.countDocuments(filters);

        const pdfs = await pdfModel
            .find(filters)
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            data: pdfs,
            pagination: {
                total: totalPdfs,
                page,
                limit,
                totalPages: Math.ceil(totalPdfs / limit),
            },
        });
    } catch (err) {
        console.error(err);
        return next(createHttpError(500, "Error while getting PDFs"));
    }
};

// Provides PDFs of all users
const listAllPdfs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const dateString = req.query.date as string | undefined;

        const filters: Record<string, any> = {};

        if (dateString) {
            const date = new Date(dateString);
            filters.createdAt = {
                $gte: startOfDay(date),
                $lte: endOfDay(date),
            };
        }

        const totalPdfs = await pdfModel.countDocuments(filters);

        const pdfs = await pdfModel
            .find(filters)
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            data: pdfs,
            pagination: {
                total: totalPdfs,
                page,
                limit,
                totalPages: Math.ceil(totalPdfs / limit),
            },
        });
    } catch (err) {
        console.error(err);
        return next(createHttpError(500, "Error while getting PDFs"));
    }
};

const getSinglePdf = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const pdfId = req.params.pdfId;

    try {
        const pdf = await pdfModel
            .findOne({ _id: pdfId })
            // populate user field
            .populate("user", "name");
        if (!pdf) {
            return next(createHttpError(404, "Pdf not found."));
        }

        return res.json(pdf);
    } catch (err) {
        return next(createHttpError(500, "Error while getting a pdf"));
    }
};
//only for knowlegde purpose
// const deletePdf = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const pdfId = req.params.pdfId;

//         const pdf = await pdfModel.findOne({ _id: pdfId });
//         if (!pdf) {
//             return next(createHttpError(404, "Pdf not found"));
//         }

//         // Check Access
//         const _req = req as AuthRequest;
//         if (pdf.user.toString() !== _req.userId) {
//             return next(createHttpError(403, "You can not update others pdf."));
//         }

//         const pdfFileSplits = pdf.file.split("/");
//         const pdfFilePublicId =
//             pdfFileSplits.at(-2) + "/" + pdfFileSplits.at(-1);
//         console.log("pdfFilePublicId", pdfFilePublicId);
//         await cloudinary.uploader.destroy(pdfFilePublicId, {
//             resource_type: "raw",
//         });

//         await pdfModel.deleteOne({ _id: pdfId });

//         return res.sendStatus(204);
//     } catch (err) {
//         console.error("Error deleting PDF:", err);
//         next(
//             createHttpError(500, "Something went wrong while deleting the PDF.")
//         );
//     }
// };

export { createPdf, updatePdf, listPdfs, listAllPdfs, getSinglePdf };
