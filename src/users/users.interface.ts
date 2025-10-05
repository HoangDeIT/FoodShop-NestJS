import { Types } from "mongoose";

export interface IUser {
    _id: string | Types.ObjectId;
    name: string;
    email: string;
    role: string;
}