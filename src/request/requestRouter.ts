// src/request/requestRoutes.ts

import express from "express";
import {
    createRequest,
    deleteRequestStatus,
    listAllRequests,
} from "./requestController";
import authenticate from "../middlewares/authenticate"; // corrected middleware path
import adminAuthenticate from "../middlewares/adminAuthenticate";

const router = express.Router();

// POST /api/requests
// Authenticated users can submit a request linked to a PDF
router.post("/", authenticate, createRequest);
router.delete("/:requestId", adminAuthenticate, deleteRequestStatus);
router.get("/", adminAuthenticate, listAllRequests);
export default router;
