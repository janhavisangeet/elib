import { User } from "../user/userTypes";

export interface Pdf {
    _id: string;
    user: User;
    file: string;
    createdAt: Date;
    updatedAt: Date;
    valid: boolean;
    date: Date;
}
