import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { JwtPayload, verify } from "jsonwebtoken";
import { config } from "../config/config";

export interface AuthRequest extends Request {
    userId: string;
    role: string;
}

const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("Authorization");
    if (!token) {
        return next(createHttpError(401, "Authorization token is required."));
    }

    try {
        const parsedToken = token.split(" ")[1];
        const decoded = verify(
            parsedToken,
            config.jwtSecret as string
        ) as JwtPayload;

        const _req = req as AuthRequest;
        _req.userId = decoded.sub as string;
        _req.role = decoded.role as string;

        // Check if user is ADMIN
        if (_req.role !== "ADMIN") {
            return next(createHttpError(403, "Access forbidden: Admins only."));
        }

        next();
    } catch (err) {
        return next(createHttpError(401, "Invalid or expired token."));
    }
};

export default authenticate;
