import { Controller, Get, Query } from '@nestjs/common';
import { DownloadService } from './download.service';

@Controller('download')
export class DownloadController {
  constructor(private readonly videoDownloadService: DownloadService) {}
  @Get('video')
  async downloadVideo(@Query() query: any) {
    const url = decodeURIComponent(query.url);
    const userId = query.userid || '123456';
    const resData = await this.videoDownloadService.downloadVideo(url, userId);
    return { ...resData };
  }
}
