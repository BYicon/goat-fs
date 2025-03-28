import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DownloadService {
  // 定义最大允许的视频大小 (以MB为单位)
  private readonly MAX_VIDEO_SIZE_MB = 100;

  downloadPath: string;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get('BASE_URL');
    this.downloadPath = `${baseUrl}/videos`;
  }

  async downloadVideo(
    videoUrl: string,
    userId: string,
  ): Promise<{ url: string; size: number }> {
    // 生成保存视频的文件路径
    const videoDirectory = path.join(__dirname, '../public', 'videos');
    if (!fs.existsSync(videoDirectory)) {
      fs.mkdirSync(videoDirectory, { recursive: true });
    }

    const videoName = `${userId}_${Date.now()}.mp4`;
    const videoPath = path.join(videoDirectory, videoName);

    try {
      // 先获取文件头信息，检查文件大小
      const headResponse = await axios.head(videoUrl);
      const contentLength = headResponse.headers['content-length'];

      if (!contentLength) {
        throw new HttpException(
          'Could not retrieve video size',
          HttpStatus.BAD_REQUEST,
        );
      }

      const fileSizeInBytes = parseInt(contentLength, 10);
      const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

      // 如果文件大小超出限制，则抛出异常
      if (fileSizeInMegabytes > this.MAX_VIDEO_SIZE_MB) {
        throw new HttpException(
          `Video exceeds size limit of ${this.MAX_VIDEO_SIZE_MB}MB`,
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      // 开始下载视频
      const response = await axios({
        url: videoUrl,
        method: 'GET',
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(videoPath);

      // 将数据流写入文件系统
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          writer.end(); // 🟣🟣🟣文件流的关闭，防止文件一直被占用。
          // 获取视频大小信息
          const stats = fs.statSync(videoPath);
          const fileSizeInBytes = stats.size;
          const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

          const resData = {
            url: `${this.downloadPath}/${videoName}`,
            size: +fileSizeInMegabytes.toFixed(2),
          };
          console.log('Video download successfully.');
          resolve(resData);
        });

        writer.on('error', (err) => {
          reject(
            new HttpException(
              `File write error: ${err.message}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        });

        writer.on('close', () => {
          this.scheduleVideoDeletion(videoPath);
        });
      });
    } catch (error) {
      throw new HttpException(
        `Download failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private scheduleVideoDeletion(videoPath: string) {
    // 删除视频文件的方法
    setTimeout(() => {
      fs.unlink(videoPath, (err) => {
        if (err) {
          console.error('Error deleting the video:', err);
          return;
        }
        console.log('Video deleted successfully.');
      });
    }, 3600000); // 1小时后删除视频
  }
}
