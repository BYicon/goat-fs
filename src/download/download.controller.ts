import { Controller, Get, Query } from '@nestjs/common';
import { DownloadService } from './download.service';
import { IsUrl, IsNotEmpty, IsIn } from 'class-validator';

class DownloadQueryDto {
  @IsUrl({}, { message: '请提供有效的URL' })
  url: string;

  @IsNotEmpty({ message: '请提供文件名前缀' })
  name_prefix: string;

  @IsIn(['video', 'image'], { message: '类型必须是 video 或 image' })
  type: 'video' | 'image';
}

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get()
  async downloadFile(@Query() query: DownloadQueryDto) {
    const url = decodeURIComponent(query.url);
    const name_prefix = query.name_prefix || '123456';
    const type = query.type;

    const resData = await this.downloadService.downloadFile(
      url,
      name_prefix,
      type,
    );
    return { ...resData };
  }
}
