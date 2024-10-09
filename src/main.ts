import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '.', 'public'));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const baseUrl = configService.get<number>('BASE_URL');
  await app.listen(port);
  const orangeColor = '\u001b[38;5;214m'; // orange color
  const resetColor = '\u001b[0m'; // reset color
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `\u001b]8;;${baseUrl}:${port}\u0007${orangeColor}${baseUrl}:${port}${resetColor}\u001b]8;;\u0007`,
    );
  } else {
    console.log(`listen on ${port}`);
  }
}

bootstrap();
