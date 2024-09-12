import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DownloadModule } from './download/download.module';

@Module({
  imports: [DownloadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
