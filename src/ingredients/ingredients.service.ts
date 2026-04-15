import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import Fuse from 'fuse.js';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes ingredient name to avoid duplicates
   * Converts to lowercase, trims whitespace, removes extra spaces
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Smart findOrCreate with Fuzzy Matching using Fuse.js
   * First tries exact match by normalized name
   * If no exact match, uses fuzzy matching with threshold 0.3
   * Returns existing ingredient if similar enough, otherwise creates new
   */
  async findOrCreate(name: string) {
    const normalized = this.normalizeName(name);

    // First try exact match
    const exactMatch = await this.prisma.ingredient.findUnique({
      where: { normalized },
      include: { nutrition: true },
    });

    if (exactMatch) {
      return exactMatch;
    }

    // If no exact match, try fuzzy matching
    const allIngredients = await this.prisma.ingredient.findMany({
      select: { id: true, name: true, normalized: true },
    });

    if (allIngredients.length > 0) {
      // Use Fuse.js for fuzzy matching
      // Include both original names and normalized names for better matching
      const searchableNames = allIngredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        normalized: ing.normalized,
      }));

      const fuse = new Fuse(searchableNames, {
        keys: ['name', 'normalized'],
        threshold: 0.3,
        includeScore: true,
      });

      const results = fuse.search(normalized);

      if (results.length > 0) {
        const bestMatch = results[0];
        const score = bestMatch.score ?? 1;

        // Fuse.js: lower score = better match (0 = perfect, 1 = no match)
        // threshold: 0.3 means score <= 0.3 is a good match
        if (score <= 0.3) {
          // Return the matched ingredient with full data
          return this.prisma.ingredient.findUnique({
            where: { id: bestMatch.item.id },
            include: { nutrition: true },
          });
        }
      }
    }

    // No match found, create new ingredient
    return this.prisma.ingredient.create({
      data: {
        name: name.trim(),
        normalized,
      },
      include: {
        nutrition: true,
      },
    });
  }

  async getNutrition(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { nutrition: true },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (!ingredient.nutrition) {
      throw new NotFoundException(
        `No nutrition data found for ingredient ${ingredientId}`,
      );
    }

    return ingredient.nutrition;
  }

  async addNutrition(ingredientId: string, nutritionData: any) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { nutrition: true },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (ingredient.nutrition) {
      throw new ConflictException(
        `Nutrition data already exists for ingredient ${ingredientId}. Use PATCH to update.`,
      );
    }

    return this.prisma.nutrition.create({
      data: {
        ingredientId,
        caloriesPer100: nutritionData.caloriesPer100,
        caloriesUnit: nutritionData.caloriesUnit || 'kcal',
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        fiber: nutritionData.fiber,
      },
    });
  }

  async updateNutrition(ingredientId: string, nutritionData: any) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { nutrition: true },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (!ingredient.nutrition) {
      throw new NotFoundException(
        `No nutrition data found for ingredient ${ingredientId}. Use POST to create.`,
      );
    }

    return this.prisma.nutrition.update({
      where: { ingredientId },
      data: nutritionData,
    });
  }

  async removeNutrition(ingredientId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { nutrition: true },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (!ingredient.nutrition) {
      throw new NotFoundException(
        `No nutrition data found for ingredient ${ingredientId}`,
      );
    }

    await this.prisma.nutrition.delete({
      where: { ingredientId },
    });
  }

  async create(createIngredientDto: CreateIngredientDto) {
    const normalized = this.normalizeName(createIngredientDto.name);

    try {
      return await this.prisma.ingredient.create({
        data: {
          name: createIngredientDto.name.trim(),
          normalized,
        },
        include: {
          nutrition: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `Ingredient with normalized name "${normalized}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      include: {
        nutrition: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        nutrition: true,
      },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }

    return ingredient;
  }

  async findByName(name: string) {
    const normalized = this.normalizeName(name);
    return this.prisma.ingredient.findUnique({
      where: { normalized },
      include: {
        nutrition: true,
      },
    });
  }

  async update(id: string, updateIngredientDto: UpdateIngredientDto) {
    try {
      const data: any = { ...updateIngredientDto };

      // If name is being updated, also update normalized
      if (updateIngredientDto.name) {
        data.normalized = this.normalizeName(updateIngredientDto.name);
        data.name = updateIngredientDto.name.trim();
      }

      const ingredient = await this.prisma.ingredient.update({
        where: { id },
        data,
        include: {
          nutrition: true,
        },
      });
      return ingredient;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Ingredient with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException(
          `Ingredient with this normalized name already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // Check if ingredient is used in any recipes
      const recipeIngredients = await this.prisma.recipeIngredient.findMany({
        where: { productId: id },
      });

      if (recipeIngredients.length > 0) {
        throw new ConflictException(
          `Cannot delete ingredient with ID ${id} because it is used in ${recipeIngredients.length} recipe(s)`,
        );
      }

      await this.prisma.ingredient.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Ingredient with ID ${id} not found`);
      }
      throw error;
    }
  }
}
