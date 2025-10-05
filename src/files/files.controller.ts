import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipeBuilder, HttpStatus, UseFilters, UploadedFiles } from '@nestjs/common';

import { Public, ResponseMessage } from 'src/decorator/customize';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';


@Controller('files')
export class FilesController {


    @Public()
    @Post('/upload')
    @UseInterceptors(FileInterceptor('fileUpload'))
    @ResponseMessage("Upload Single File")

    // @UseFilters(new HttpExceptionFilter())
    uploadFile(@UploadedFile(
        // new ParseFilePipeBuilder()
        //   .addFileTypeValidator({
        //     fileType: /^(jpg|jpeg|image\/jpeg|png|image\/png|gif|txt|pdf|application\/pdf|doc|docx|text\/plain)$/i,
        //   })
        //   .addMaxSizeValidator({
        //     maxSize: 1024 * 1024 //kb = 1 MB
        //   })
        //   .build({
        //     errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        //   }),
    ) file: Express.Multer.File) {
        return {
            fileName: file.filename
        }
    }
    @Public()
    @Post('/upload-mixed')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'filesUpload', maxCount: 10 },

    ]))
    uploadMixedFiles(
        @UploadedFiles() files: {
            filesUpload?: Express.Multer.File[],

        }
    ) {
        return {
            avatars: files.filesUpload?.map(f => f.filename),
        };
    }
}
