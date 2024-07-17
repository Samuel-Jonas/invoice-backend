import { PutObjectCommand, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { AnalyzeDocumentCommand, TextractClient, AnalyzeDocumentCommandInput, AnalyzeDocumentResponse, Block } from '@aws-sdk/client-textract';
import { Injectable } from '@nestjs/common';
import { Invoice } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from 'src/database/service/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) { }

  async uploadFile(file: Express.Multer.File): Promise<PutObjectCommandOutput> {
    try {
      const { originalname } = file;

      return await this.s3_upload(
        file.buffer,
        process.env.AWS_S3_BUCKET,
        originalname,
        file.mimetype
      );
    } catch(err) {
      throw err;
    }
  }

  private async s3_upload(file, bucket, name, mimetype): Promise<PutObjectCommandOutput> {
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
      }
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: String(name),
      Body: file,
      ContentType: mimetype
    });

    try {

      const s3_upload = await client.send(command);

      return s3_upload;

    } catch (e) {
      console.log(e);   
    }

    return { $metadata: { httpStatusCode: 400 }};
  }

  async textract_file_text(file: Express.Multer.File): Promise<AnalyzeDocumentResponse> {
    try {
      const client = new TextractClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.ACCESS_KEY_ID,
          secretAccessKey: process.env.SECRET_ACCESS_KEY
        }
      });
  
      const { originalname } = file
  
      const input: AnalyzeDocumentCommandInput = {
        Document: {
          Bytes: new Uint8Array(file.buffer),
          S3Object: {
            Bucket: process.env.AWS_S3_BUCKET,
            Name: originalname
          }
        },
        FeatureTypes: [
          "TABLES"
        ],
      };
  
      const command = new AnalyzeDocumentCommand(input);
      return await client.send(command);
    } catch(err) {
      throw err;
    }
  }

  async saveInvoice(fileBlocks: Block[], userId: string) {
    try {
      let invoices: Omit<Invoice, 'id'>[] = this.extractBlocksToSave(fileBlocks, userId);
      console.log(invoices);
      await this.createInvoice(invoices);
    } catch(err) {
      console.log(err);
      throw err;
    }
  }

  private extractBlocksToSave(fileBlocks: Block[], userId: string): Omit<Invoice, 'id'>[] {
    try {
      let table: string[][] = [];

      const tables = fileBlocks.filter(item =>
         item.BlockType === "TABLE" && 
         item.EntityTypes.includes("STRUCTURED_TABLE")
      );
  
      let objectIds: string[] = tables.flatMap(table =>
        table.Relationships
          .filter(relationship => relationship.Type === "CHILD")
          .flatMap(relationship => relationship.Ids)
      );
  
      let objectTableHeader = fileBlocks
      .filter(obj => objectIds.includes(obj.Id))
      .filter(item => 
        item.BlockType === "CELL" &&
        (item.EntityTypes != undefined && item.EntityTypes.includes("COLUMN_HEADER"))
      );
  
      let headerValues: string[] = new Array();
  
      objectTableHeader.forEach(tableObject => {
        let tableHeaderIds: string[] = tableObject.Relationships.filter(x => x.Type === "CHILD").flatMap(m => m.Ids);
        let finalString: string = "";
        tableHeaderIds.forEach((id, index) => {
          let individualTitle: string = fileBlocks.find(objs => objs.Id === id).Text;
          finalString += index == 0 ? individualTitle : ` ${individualTitle}`;  
        });
        headerValues.push(finalString);
      });
  
      let objectCells = fileBlocks
      .filter(obj => objectIds.includes(obj.Id))
      .filter(x => 
        x.BlockType === "CELL" && x.EntityTypes === undefined
      );
  
      let cellValues: string[] = new Array();
  
      objectCells.forEach(cells => {
        let cellIds: string[] = cells.Relationships.filter(x => x.Type === "CHILD").flatMap(m => m.Ids);
        let pivotString: string = "";
        cellIds.forEach((id, index)=> {
          let individualText: string = fileBlocks.find(objs => objs.Id === id).Text;
          pivotString += index == 0 ? individualText : ` ${individualText}`;
        });
        cellValues.push(pivotString);
      });
  
      table = this.splitArrayIntoChunks(cellValues, headerValues.length);
  
      let quantityMatches: number[] = this.findIndexesMatchingPattern(headerValues, /\b(qtd|quantidade|quantity)\b/i);
      let descriptionMatches: number[] = this.findIndexesMatchingPattern(headerValues, /\b(descrição|description)\b/i);
      let priceMatches: number[] = this.findIndexesMatchingPattern(headerValues, /\b(preço|price|preco)\b/i);
      let totalMatches: number[] = this.findIndexesMatchingPattern(headerValues, /\b(valor|value)\b/i)
  
      let invoices: Omit<Invoice, 'id'>[] = [];
  
      table.forEach((item, index) => {
        let quantityProps: number = 0;
        let descriptionProps: string = "";
        let priceProps: number = 0.00;
        let totalProps: number = 0.00;
  
        if (quantityMatches.length > 0 && item.length > quantityMatches[0])
          quantityProps = parseInt(item[quantityMatches[0]]);
  
        if (descriptionMatches.length > 0 && item.length > descriptionMatches[0])
          descriptionProps = item[descriptionMatches[0]];
  
        if(priceMatches.length > 0 && item.length > priceMatches[0])
          priceProps = parseFloat(item[priceMatches[0]]);
  
        if (totalMatches.length > 0 && item.length > totalMatches[0])
          totalProps = parseFloat(item[totalMatches[0]]);
  
        let invoice: Omit<Invoice, 'id'> = {
          quantity: quantityProps,
          description: descriptionProps,
          price: new Decimal(priceProps),
          total: new Decimal(totalProps),
          userId: userId,
          createdAt: new Date()};
  
        invoices.push(invoice);
      });
  
      return invoices;
    } catch (err) {
      throw err;
    }
  }

  private findIndexesMatchingPattern(arr: string[], pattern: RegExp): number[] {
    try {
      let indexes: number[] = [];
      arr.forEach((item, index) => {
        if (pattern.test(item)) {
          indexes.push(index);
        }
      });
      return indexes;
    } catch (err) {
      throw err;
    }
  }

  private splitArrayIntoChunks(arr: string[], chunkSize: number): string[][] {
    try {
      let result: string[][] = [];
      for (let i = 0; i < arr.length; i += chunkSize) {
        let chunk = arr.slice(i, i + chunkSize);
        result.push(chunk);
      }
      return result;
    } catch (err) {
      throw err;
    }
  }

  private async createInvoice(data: Omit<Invoice, 'id'>[]) {
    try {
      return await this.prisma.invoice.createMany({data});
    } catch (err) {
      throw err;
    }
  }
}
