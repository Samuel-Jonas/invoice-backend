import { Controller, Post, UseInterceptors, UploadedFile, Body, Res } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { AnalyzeDocumentResponse } from '@aws-sdk/client-textract'
import { fileBodyDto } from 'src/dtos/fileBody.dto';
import { Response } from 'express'

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File, 
    @Body()  body: fileBodyDto,
    @Res() res: Response
    ) {

    try {

      res.setHeader('Access-Control-Allow-Origin', '*');

      const { userId } = body;

      console.log(userId);

      if (userId === undefined || userId === null) {
        
        return res.status(400).json({statusCode: 400, timestamp: new Date().toISOString(), path: "/invoice/upload", error: "não foi informado o userId"});
      }

      const uploadedFile: PutObjectCommandOutput =  await this.invoiceService.uploadFile(file);

      if (uploadedFile.$metadata.httpStatusCode == 200) {

        const fileTexted: AnalyzeDocumentResponse = await this.invoiceService.textract_file_text(file);

        await this.invoiceService.saveInvoice(fileTexted.Blocks, userId);

      } else {
        return res.status(400).json({statusCode: 400, timestamp: new Date().toISOString(), path: "/invoice/upload", error: "não foi possível salvar o arquivo"});
      }

      return res.status(201).json({statusCode: 201, timestamp: new Date().toISOString(), path: "/invoice/upload", error: null});

    } catch (err) {
      console.log(err);
    }
  }
}
