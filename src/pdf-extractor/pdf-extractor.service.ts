import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ParsedRecipeData,
  ParsedRecipesBatchDto,
} from 'src/recipes/dto/parsed-recipe.dto';
import { PDFParse } from 'pdf-parse';
import Groq from 'groq-sdk';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);
  private groq: Groq;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not set in environment variables.');
      throw new Error('GROQ_API_KEY is not configured.');
    }
    this.groq = new Groq({ apiKey });
    this.modelName = this.configService.get<string>(
      'GROQ_MODEL',
      'llama-3.3-70b-versatile',
    );
  }

  /**
   * Extracts text content from a PDF file buffer.
   * @param pdfBuffer The buffer containing the PDF file data.
   * @returns A promise that resolves to the extracted text.
   */
  async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    this.logger.log('Extracting text from PDF buffer...');
    try {
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      const data = await parser.getText();
      this.logger.log('Text extraction from PDF successful.');
      return data.text;
    } catch (error) {
      this.logger.error('Failed to extract text from PDF.', error);
      throw new Error('Could not parse the PDF file.');
    }
  }

  async extractRecipeData(text: string): Promise<ParsedRecipesBatchDto> {
    this.logger.log('Sending text to Groq API for processing...');
    const prompt = `Given the following meal plan text, extract ALL recipes into a JSON object with a "recipes" array field matching the TypeScript interface below.

TypeScript Interface:
interface ParsedRecipeData {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: {
    name: string;
    quantity?: number;
    unit?: string;
  }[];
  instructions: {
    step: number;
    content: string;
  }[];
}

interface ParsedRecipesBatchDto {
  recipes: ParsedRecipeData[];
}

Important rules:

- The text may contain MULTIPLE recipes.
- Each recipe should be returned as a SEPARATE object in the recipes array.
- Do NOT wrap the output in markdown code blocks.
- Return ONLY the raw JSON object with a "recipes" field containing the array.
- Do NOT merge multiple meals into one recipe.
- Recipes often start with a title in uppercase (e.g. "SPAGHETTI BOLOGNESE", "SAŁATKA BURAK Z FETĄ").
- Ignore section labels like "ŚNIADANIE", "OBIAD", "KOLACJA" if they are not recipe names.
- Extract ingredients with numeric quantities only; if no quantity exists, write null.
- Number instruction steps starting from 1 for EACH recipe.
- If a field is missing, omit it.

Return ONLY a raw JSON object with the structure: {"recipes": [...]}. No markdown, no explanations.

Recipe Text:
${text}
`;

    try {
      // Debugging: Save the prompt to a file for inspection
      // const debugFilePath = path.join(
      //   './uploads',
      //   `${Date.now()}-parsed-prompt.txt`,
      // );
      // await fs.writeFile(debugFilePath, JSON.stringify(text, null, 2));
      // this.logger.log(`Parsed recipe data saved to ${debugFilePath}`);

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that extracts structured data from recipes. You output only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.modelName,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const jsonText = completion.choices[0]?.message?.content?.trim();

      if (!jsonText) {
        throw new Error('Empty response from Groq API');
      }

      const parsedData = JSON.parse(jsonText) as ParsedRecipesBatchDto;

      if (!parsedData.recipes || !Array.isArray(parsedData.recipes)) {
        this.logger.error(
          'Invalid response structure. Expected {recipes: [...]}',
        );
        throw new Error('Invalid response structure from AI model');
      }

      this.logger.log(
        `Groq API response parsed successfully. Found ${parsedData.recipes.length} recipes.`,
      );
      return parsedData;
    } catch (error) {
      this.logger.error('Error calling Groq API or parsing response:', error);
      throw new Error('Failed to process recipe text with AI model.');
    }
  }
}
