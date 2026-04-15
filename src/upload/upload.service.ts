import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SseService } from '../sse/sse.service';
import { PdfExtractorService } from '../pdf-extractor/pdf-extractor.service';
import { RecipesService } from '../recipes/recipes.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  // private readonly uploadDir = './uploads';

  constructor(
    private readonly sseService: SseService,
    private readonly pdfExtractorService: PdfExtractorService,
    private readonly recipesService: RecipesService,
  ) {
    // this.ensureUploadDirExists();
  }

  // private async ensureUploadDirExists() {
  //   try {
  //     await fs.access(this.uploadDir);
  //   } catch {
  //     this.logger.log(
  //       `Upload directory not found. Creating: ${this.uploadDir}`,
  //     );
  //     await fs.mkdir(this.uploadDir, { recursive: true });
  //   }
  // }

  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Processes a PDF file and extracts multiple recipes.
   * Creates a batch job that tracks all extracted recipes.
   * @param file The uploaded PDF file
   * @param jobId The unique job ID for SSE tracking
   * @returns Array of created recipe IDs
   */
  async processPdfJob(
    file: Express.Multer.File,
    jobId: string,
  ): Promise<string[]> {
    const batchJobId = jobId;
    this.logger.log(`Starting PDF batch processing. Job ID: ${batchJobId}`);

    this.sseService.sendEvent(batchJobId, 'parsingStatus', {
      status: 'started',
      filename: file.originalname,
    });

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath: string | null = null;

    try {
      // filePath = path.join(this.uploadDir, filename);
      // await fs.writeFile(filePath, file.buffer);
      // this.logger.log(`File saved to ${filePath}`);

      this.sseService.sendEvent(batchJobId, 'parsingStatus', {
        status: 'extracting_text',
      });
      const extractedText = await this.pdfExtractorService.extractTextFromPdf(
        file.buffer,
      );

      this.sseService.sendEvent(batchJobId, 'parsingStatus', {
        status: 'processing_ai',
      });
      const parsedBatch =
        await this.pdfExtractorService.extractRecipeData(extractedText);

      this.logger.log(
        `AI extracted ${parsedBatch.recipes.length} recipes from PDF`,
      );

      // Save parsed recipes to txt file for debugging
      // const debugFilePath = path.join(
      //   this.uploadDir,
      //   `${Date.now()}-parsed-${file.originalname}.txt`,
      // );
      // await fs.writeFile(debugFilePath, JSON.stringify(parsedBatch, null, 2));
      // this.logger.log(`Parsed batch data saved to ${debugFilePath}`);

      this.sseService.sendEvent(batchJobId, 'parsingStatus', {
        status: 'saving_recipes',
        recipeCount: parsedBatch.recipes.length,
      });

      // Create all recipes from the batch
      const createdRecipes = await this.recipesService.createBatch(parsedBatch);
      const recipeIds = createdRecipes.map((r) => r.id);

      this.logger.log(
        `Successfully created ${createdRecipes.length} recipes: ${recipeIds.join(', ')}`,
      );

      this.sseService.sendEvent(batchJobId, 'parsingStatus', {
        status: 'finished',
        recipes: createdRecipes,
        recipeIds: recipeIds,
      });

      this.logger.log(
        `Successfully finished batch processing. Job: ${batchJobId}`,
      );

      return recipeIds;
    } catch (error) {
      this.logger.error(`Batch job ${batchJobId} failed:`, error);
      this.sseService.sendEvent(batchJobId, 'parsingStatus', {
        status: 'failed',
        error: error.message,
      });
      throw error;
    } finally {
      if (filePath) {
        await this.cleanupFile(filePath);
      }
      this.logger.log(`Completing SSE stream for batch job: ${batchJobId}`);
      this.sseService.completeStream(batchJobId);
    }
  }
}
