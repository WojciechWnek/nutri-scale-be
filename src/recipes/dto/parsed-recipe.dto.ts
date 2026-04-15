export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit?: string;
}

export interface ParsedInstruction {
  step: number;
  content: string;
}

export interface ParsedRecipeData {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: ParsedIngredient[];
  instructions: ParsedInstruction[];
}

export interface ParsedRecipesBatchDto {
  recipes: ParsedRecipeData[];
}
