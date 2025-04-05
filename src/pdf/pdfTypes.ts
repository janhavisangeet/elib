import { User } from "../user/userTypes";

export interface Pdf {
  _id: string;
  year: Number;
  month: string;
  user: User;
  file: string;
  createdAt: Date;
  updatedAt: Date;
}
