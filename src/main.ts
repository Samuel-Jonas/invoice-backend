import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsLoggerFilter } from './handlers/exceptionLogger.handler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ExceptionsLoggerFilter());
  await app.listen(5000);
}
bootstrap();
