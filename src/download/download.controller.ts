import { Controller, Get, Query } from '@nestjs/common';
import { DownloadService } from './download.service';

@Controller('download')
export class DownloadController {
  constructor(private readonly videoDownloadService: DownloadService) {}
  @Get('video')
  async downloadVideo(@Query() query: any) {
    const url = decodeURIComponent(query.url);
    const resData = await this.videoDownloadService.downloadVideo(
      url,
      query.userid,
    );
    return { ...resData };
  }
}
