import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DownloadModule } from './download/download.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    DownloadModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}`, // 根据 NODE_ENV 动态加载
        '.env', // 默认加载 .env 文件
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
