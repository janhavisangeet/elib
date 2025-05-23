import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./user/userRouter";
import pdfRouter from "./pdf/pdfRouter";
import { config } from "./config/config";
//import { request } from "http";
import requestRouter from "./request/requestRouter";

const app = express();

app.use(
    cors({
        origin: config.frontendDomain,
    })
);

app.use(express.json());

// Routes
// Http methods: GET, POST, PUT, PATCH, DELETE
app.get("/", (req, res, next) => {
    res.json({ message: "Welcome to elib apis" });
});

app.use("/api/users", userRouter);
app.use("/api/pdfs", pdfRouter);
app.use("/api/requests", requestRouter);

// Global error handler
app.use(globalErrorHandler);

export default app;
