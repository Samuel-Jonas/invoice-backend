import { Controller, Post, UseInterceptors, UploadedFile, UseFilters } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { AnalyzeDocumentResponse } from '@aws-sdk/client-textract'

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {

    try {

      const uploadedFile: PutObjectCommandOutput =  await this.invoiceService.uploadFile(file);

      if (uploadedFile.$metadata.httpStatusCode == 200) {

        const fileTexted: AnalyzeDocumentResponse = await this.invoiceService.textract_file_text(file);

        await this.invoiceService.saveInvoice(fileTexted.Blocks);

      } else {
        return {statusCode: 400, timestamp: new Date().toISOString(), path: "/invoice/upload", error: "não foi possível salvar o arquivo"}
      }

      return {statusCode: 201, timestamp: new Date().toISOString(), path: "/invoice/upload", error: null}

    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
