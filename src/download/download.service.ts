import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DownloadService {
  private readonly MAX_VIDEO_SIZE_MB = 100;
  private readonly MAX_IMAGE_SIZE_MB = 10;
  private readonly SUPPORTED_VIDEO_FORMATS = [
    '.mp4',
    '.avi',
    '.mov',
    '.webm',
    '.mkv',
  ];
  private readonly SUPPORTED_IMAGE_FORMATS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
  ];
  private readonly DELETE_AFTER_HOURS = 1;
  private readonly baseDirectory: string;
  private readonly downloadPath: string;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('BASE_URL');
    if (!baseUrl) {
      throw new Error('BASE_URL configuration is missing');
    }
    this.downloadPath = baseUrl;
    this.baseDirectory = path.join(process.cwd(), 'dist', 'public');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    try {
      // 首先确保基础目录存在
      if (!fs.existsSync(this.baseDirectory)) {
        console.log(`创建基础目录: ${this.baseDirectory}`);
        fs.mkdirSync(this.baseDirectory, { recursive: true });
      }

      // 然后创建子目录
      const dirs = ['videos', 'images'];
      dirs.forEach((dir) => {
        const fullPath = path.join(this.baseDirectory, dir);
        if (!fs.existsSync(fullPath)) {
          console.log(`创建子目录: ${fullPath}`);
          fs.mkdirSync(fullPath, { recursive: true });
        }
      });
    } catch (error) {
      console.error('创建目录时发生错误:', error);
      throw new HttpException(
        `创建目录失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateFileFormat(
    fileExtension: string,
    type: 'video' | 'image',
  ): void {
    const supportedFormats =
      type === 'video'
        ? this.SUPPORTED_VIDEO_FORMATS
        : this.SUPPORTED_IMAGE_FORMATS;

    if (!supportedFormats.includes(fileExtension)) {
      throw new HttpException(
        `不支持的${type === 'video' ? '视频' : '图片'}格式。支持的格式：${supportedFormats.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async validateFileSize(
    url: string,
    type: 'video' | 'image',
  ): Promise<number> {
    try {
      // 添加请求头，模拟浏览器请求
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      };

      // 首先尝试 HEAD 请求
      try {
        const headResponse = await axios.head(url, { headers });
        const contentLength = headResponse.headers['content-length'];
        const contentType = headResponse.headers['content-type'];

        if (contentLength && contentType) {
          return this.validateContentTypeAndSize(
            contentLength,
            contentType,
            type,
          );
        }
      } catch (error) {
        console.log('HEAD 请求失败，尝试 GET 请求');
      }

      // 如果 HEAD 请求失败，尝试 GET 请求并只获取头部信息
      const response = await axios.get(url, {
        headers,
        responseType: 'stream',
        maxContentLength: Infinity,
      });

      const contentLength = response.headers['content-length'];
      const contentType = response.headers['content-type'];

      if (!contentLength) {
        throw new HttpException('无法获取文件大小', HttpStatus.BAD_REQUEST);
      }

      return this.validateContentTypeAndSize(contentLength, contentType, type);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `文件验证失败: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 抽取验证逻辑到单独的方法
  private validateContentTypeAndSize(
    contentLength: string,
    contentType: string,
    type: 'video' | 'image',
  ): number {
    // 内容类型验证可以放宽松一点，因为有些服务器可能返回通用的 content-type
    if (
      contentType &&
      type === 'video' &&
      !contentType.includes('video') &&
      !contentType.includes('application/octet-stream')
    ) {
      throw new HttpException(`不是有效的视频文件`, HttpStatus.BAD_REQUEST);
    }

    if (
      contentType &&
      type === 'image' &&
      !contentType.includes('image') &&
      !contentType.includes('application/octet-stream')
    ) {
      throw new HttpException(`不是有效的图片文件`, HttpStatus.BAD_REQUEST);
    }

    const maxSize =
      type === 'video' ? this.MAX_VIDEO_SIZE_MB : this.MAX_IMAGE_SIZE_MB;
    const fileSizeInMegabytes = parseInt(contentLength, 10) / (1024 * 1024);

    if (fileSizeInMegabytes > maxSize) {
      throw new HttpException(
        `文件大小超过限制 ${maxSize}MB`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    return fileSizeInMegabytes;
  }

  private async downloadAndSaveFile(
    url: string,
    filePath: string,
  ): Promise<number> {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        writer.end();
        const stats = fs.statSync(filePath);
        resolve(stats.size / (1024 * 1024));
      });

      writer.on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(
          new HttpException(
            `文件写入错误: ${err.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        );
      });

      writer.on('close', () => {
        this.scheduleFileDeletion(filePath);
      });
    });
  }

  async downloadFile(
    fileUrl: string,
    namePrefix: string,
    type: 'video' | 'image',
  ): Promise<{ url: string; size: number }> {
    try {
      console.log('开始下载文件: 🔵🔵🔵', fileUrl);
      let fileExtension = '';
      try {
        const url = new URL(fileUrl);
        const pathname = url.pathname;
        const fileName = pathname.split('/').pop() || '';
        fileExtension =
          fileName.split('.').length > 1
            ? '.' + fileName.split('.')[1].toLowerCase()
            : type === 'video'
              ? '.mp4'
              : '.jpg';
      } catch (error) {
        fileExtension = type === 'video' ? '.mp4' : '.jpg';
      }

      this.validateFileFormat(fileExtension, type);
      await this.validateFileSize(fileUrl, type);

      const fileName = `${namePrefix}_${Date.now()}${fileExtension}`;
      const subDir = type === 'video' ? 'videos' : 'images';
      const filePath = path.join(this.baseDirectory, subDir, fileName);


      const fileSizeInMB = await this.downloadAndSaveFile(fileUrl, filePath);
      console.log('文件下载完成，大小: 🟢🟢🟢', fileSizeInMB, 'MB');

      return {
        url: `${this.downloadPath}/${subDir}/${fileName}`,
        size: +fileSizeInMB.toFixed(2),
      };
    } catch (error) {
      console.error('下载文件时发生错误: 🔴🔴🔴', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `下载失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private scheduleFileDeletion(filePath: string): void {
    const deleteAfterMs = this.DELETE_AFTER_HOURS * 60 * 60 * 1000;
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('删除文件失败: 🔴🔴🔴', err);
          return;
        }
        console.log('文件已成功删除: 🟢🟢🟢');
      });
    }, deleteAfterMs);
  }
}
