import { Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.config';

@Module({
  controllers: [FilesController],
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    })
  ]
})
export class FilesModule { }
