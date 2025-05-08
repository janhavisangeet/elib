// src/request/requestRoutes.ts

import express from "express";
import {
    createDeleteRequest,
    createEditRequest,
    deleteRequestStatus,
    editRequestStatus,
    listAllRequests,
} from "./requestController";
import authenticate from "../middlewares/authenticate"; // corrected middleware path
import adminAuthenticate from "../middlewares/adminAuthenticate";
import multer from "multer";
import path from "node:path";

const upload = multer({
    dest: path.resolve(__dirname, "../../public/data/uploads"),
    limits: { fileSize: 3e7 }, // 10*1024*1024 = 10mb
});

const router = express.Router();

router.get("/", adminAuthenticate, listAllRequests);

// POST /api/requests
// Authenticated users can submit a request linked to a PDF
router.post("/", authenticate, createDeleteRequest);
router.delete("/:requestId", adminAuthenticate, deleteRequestStatus);
//edit request
router.post(
    "/edit",
    authenticate,
    upload.fields([{ name: "newFile", maxCount: 1 }]),
    createEditRequest
);

router.put("/edit/:requestId/status", adminAuthenticate, editRequestStatus);

export default router;
