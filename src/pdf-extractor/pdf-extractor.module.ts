import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfExtractorService } from './pdf-extractor.service';

@Module({
  imports: [ConfigModule],
  providers: [PdfExtractorService],
  exports: [PdfExtractorService],
})
export class PdfExtractorModule {}
