import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateIngredientNutritionDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  caloriesPer100: number;

  @IsString()
  @IsOptional()
  caloriesUnit?: string = 'kcal';

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
