import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExceptionsLoggerFilter } from './handlers/exceptionLogger.handler';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOptions: CorsOptions = {
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With, access-control-allow-origin, cache-control',
  };

  app.useGlobalFilters(new ExceptionsLoggerFilter());

  app.enableCors(corsOptions);
  await app.listen(5000);
}
bootstrap();
