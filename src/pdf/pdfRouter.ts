import path from "node:path";
import express from "express";
import {
  createPdf,
  deletePdf,
  getSinglePdf,
  listPdfs,
  updatePdf,
} from "./pdfController";
import multer from "multer";
import authenticate from "../middlewares/authenticate";

const pdfRouter = express.Router();

// file store local ->
const upload = multer({
  dest: path.resolve(__dirname, "../../public/data/uploads"),
  // todo: put limit 10mb max.
  limits: { fileSize: 3e7 }, // 30mb 30 * 1024 * 1024
});
// routes
// /api/pdfs
pdfRouter.post(
  "/",
  authenticate,
  upload.fields([
    // { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createPdf
);

pdfRouter.patch(
  "/:pdfId",
  authenticate,
  upload.fields([
    // { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  updatePdf
);

pdfRouter.get("/", listPdfs);
pdfRouter.get("/:pdfId", getSinglePdf);

pdfRouter.delete("/:pdfId", authenticate, deletePdf);

export default pdfRouter;
