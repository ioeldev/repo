import { UsersModel } from '../../models/users.model';
import { UploadedFile } from 'express-fileupload';
export {};

declare global {
    namespace Express {
        export interface Request {
            user?: UsersModel;
            files?: UploadedFile[];
        }
    }
}
