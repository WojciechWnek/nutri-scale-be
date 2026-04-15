import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateIngredientNutritionDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  caloriesPer100?: number;

  @IsString()
  @IsOptional()
  caloriesUnit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  protein?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  carbs?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fat?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fiber?: number;
}
