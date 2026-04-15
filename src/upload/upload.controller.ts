import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Sse,
  MessageEvent,
  Param,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SseService } from '../sse/sse.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly sseService: SseService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('pdf')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(pdf)$/)) {
          return callback(
            new BadRequestException('Only PDF files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ jobId: string; message: string }> {
    if (!file) {
      throw new BadRequestException('No PDF file provided!');
    }

    // Generate the batch job ID for SSE tracking
    const jobId = `batch-${Date.now()}`;

    // Start the batch processing job
    // processPdfJob now returns a Promise that resolves when done,
    // but we don't await it - it runs in background
    this.uploadService.processPdfJob(file, jobId);

    return {
      jobId,
      message:
        'PDF processing started. Connect to SSE stream to track progress and get recipe IDs.',
    };
  }

  @Sse('status/:jobId')
  sseEvents(
    @Param('jobId') jobId: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    // Handle client disconnects to prevent memory leaks.
    req.on('close', () => {
      this.sseService.handleDisconnect(jobId);
    });

    return this.sseService
      .createSseStream(jobId)
      .pipe(map((event) => ({ data: event.data, type: event.type })));
  }
}
