import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '.', 'public'));
  await app.listen(6003);

  const url = 'http://localhost:6003';
  const orangeColor = '\u001b[38;5;214m'; // ANSI 颜色代码，214 是橙色
  const resetColor = '\u001b[0m'; // 重置颜色
  // 输出带颜色的可点击链接
  console.log(
    `\u001b]8;;${url}\u0007${orangeColor}${url}${resetColor}\u001b]8;;\u0007`,
  );
}

bootstrap();
