import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateIngredientDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

class CreateInstructionDto {
  @IsNumber()
  @Min(1)
  step: number;

  @IsString()
  content: string;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  prepTime?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cookTime?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  servings?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIngredientDto)
  @IsOptional()
  ingredients?: CreateIngredientDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstructionDto)
  @IsOptional()
  instructions?: CreateInstructionDto[];
}
