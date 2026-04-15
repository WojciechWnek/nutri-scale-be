jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class {
    $transaction = jest.fn((cb) => cb(this));
    recipe = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    recipeIngredient = {
      create: jest.fn(),
    };
    instruction = {
      create: jest.fn(),
    };
  },
}));

jest.mock('../ingredients/ingredients.service', () => ({
  IngredientsService: class {
    findOrCreate = jest.fn();
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { NotFoundException } from '@nestjs/common';

const JobStatus = {
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

describe('RecipesService', () => {
  let service: RecipesService;
  let prismaMock: any;
  let ingredientsServiceMock: any;

  const mockIngredient = {
    id: 'ingredient-1',
    name: 'Tomato',
    normalized: 'tomato',
    nutrition: null,
  };

  const mockRecipe = {
    id: 'recipe-1',
    name: 'Tomato Soup',
    description: 'A delicious soup',
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    status: JobStatus.COMPLETED,
    ingredients: [
      {
        productId: 'ingredient-1',
        product: mockIngredient,
        quantity: 500,
        unit: 'g',
      },
    ],
    instructions: [
      { id: 'inst-1', recipeId: 'recipe-1', step: 1, content: 'Cut tomatoes' },
    ],
  };

  beforeEach(async () => {
    ingredientsServiceMock = {
      findOrCreate: jest.fn(),
    };

    prismaMock = {
      $transaction: jest.fn((callback) => callback(prismaMock)),
      recipe: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      recipeIngredient: {
        create: jest.fn(),
      },
      instruction: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: IngredientsService,
          useValue: ingredientsServiceMock,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  describe('create', () => {
    const createRecipeDto = {
      name: 'Tomato Soup',
      description: 'A delicious soup',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      ingredients: [{ name: 'Tomato', quantity: 500, unit: 'g' }],
      instructions: [{ step: 1, content: 'Cut tomatoes' }],
    };

    it('should create a recipe with ingredients and instructions', async () => {
      ingredientsServiceMock.findOrCreate.mockResolvedValue(mockIngredient);
      prismaMock.recipe.create.mockResolvedValue({ id: 'recipe-1' });
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.create(createRecipeDto);

      expect(result).toEqual(mockRecipe);
      expect(ingredientsServiceMock.findOrCreate).toHaveBeenCalledWith(
        'Tomato',
      );
      expect(prismaMock.recipe.create).toHaveBeenCalledWith({
        data: {
          name: createRecipeDto.name,
          description: createRecipeDto.description,
          prepTime: createRecipeDto.prepTime,
          cookTime: createRecipeDto.cookTime,
          servings: createRecipeDto.servings,
          status: JobStatus.COMPLETED,
        },
      });
    });

    it('should throw error if ingredient creation fails', async () => {
      ingredientsServiceMock.findOrCreate.mockResolvedValue(null);

      await expect(service.create(createRecipeDto)).rejects.toThrow(
        'Failed to find or create ingredient: Tomato',
      );
    });

    it('should create recipe without ingredients', async () => {
      prismaMock.recipe.create.mockResolvedValue({ id: 'recipe-1' });
      prismaMock.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        name: 'Simple Recipe',
        description: null,
        prepTime: null,
        cookTime: null,
        servings: null,
        status: JobStatus.COMPLETED,
        ingredients: [],
        instructions: [],
      });

      const result = await service.create({ name: 'Simple Recipe' });

      expect(result.name).toBe('Simple Recipe');
      expect(ingredientsServiceMock.findOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('createEmpty', () => {
    it('should create empty recipe with processing status', async () => {
      prismaMock.recipe.create.mockResolvedValue({
        id: 'recipe-1',
        name: 'Processing...',
        status: JobStatus.PROCESSING,
      });

      const result = await service.createEmpty();

      expect(result.status).toBe(JobStatus.PROCESSING);
      expect(prismaMock.recipe.create).toHaveBeenCalledWith({
        data: {
          name: 'Processing...',
          status: JobStatus.PROCESSING,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all completed recipes', async () => {
      prismaMock.recipe.findMany.mockResolvedValue([mockRecipe]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith({
        where: { status: JobStatus.COMPLETED },
        include: {
          ingredients: { include: { product: true } },
          instructions: { orderBy: { step: 'asc' } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return recipe by id', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.findOne('recipe-1');

      expect(result).toEqual(mockRecipe);
    });

    it('should throw NotFoundException if recipe not found', async () => {
      prismaMock.recipe.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update recipe', async () => {
      const updatedRecipe = { ...mockRecipe, name: 'Updated Name' };
      prismaMock.recipe.update.mockResolvedValue(updatedRecipe);

      const result = await service.update('recipe-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if recipe not found', async () => {
      prismaMock.recipe.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.update('invalid-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFromParsedData', () => {
    const parsedData = {
      name: 'Tomato Soup',
      description: 'Updated description',
      prepTime: 15,
      cookTime: 45,
      servings: 6,
      ingredients: [{ name: 'Tomato', quantity: 1000, unit: 'g' }],
      instructions: [{ step: 1, content: 'Cut tomatoes' }],
    };

    it('should update recipe from parsed data', async () => {
      ingredientsServiceMock.findOrCreate.mockResolvedValue(mockIngredient);
      prismaMock.recipe.findUnique.mockResolvedValueOnce({ id: 'recipe-1' });
      prismaMock.recipe.update.mockResolvedValue({ id: 'recipe-1' });
      prismaMock.recipe.findUnique.mockResolvedValueOnce({
        ...mockRecipe,
        ...parsedData,
      });

      const result = await service.updateFromParsedData('recipe-1', parsedData);

      expect(prismaMock.recipe.update).toHaveBeenCalled();
      expect(prismaMock.recipeIngredient.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if recipe not found', async () => {
      ingredientsServiceMock.findOrCreate.mockResolvedValue(mockIngredient);
      prismaMock.recipe.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateFromParsedData('invalid-id', parsedData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWithError', () => {
    it('should update recipe with error status', async () => {
      prismaMock.recipe.update.mockResolvedValue({
        id: 'recipe-1',
        status: JobStatus.FAILED,
        description: 'Error: Extraction failed',
      });

      const result = await service.updateWithError(
        'recipe-1',
        'Extraction failed',
      );

      expect(result.status).toBe(JobStatus.FAILED);
      expect(prismaMock.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          status: JobStatus.FAILED,
          description: 'Error: Extraction failed',
        },
      });
    });

    it('should throw NotFoundException if recipe not found', async () => {
      prismaMock.recipe.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateWithError('invalid-id', 'Error message'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete recipe', async () => {
      prismaMock.recipe.delete.mockResolvedValue(mockRecipe);

      await expect(service.remove('recipe-1')).resolves.not.toThrow();
      expect(prismaMock.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
    });

    it('should throw NotFoundException if recipe not found', async () => {
      prismaMock.recipe.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createBatch', () => {
    it('should create multiple recipes from batch data', async () => {
      const batchData = {
        recipes: [
          { name: 'Recipe 1', ingredients: [], instructions: [] },
          { name: 'Recipe 2', ingredients: [], instructions: [] },
        ],
      };

      const createFromParsedSpy = jest
        .spyOn(service as any, 'createFromParsedData')
        .mockResolvedValue(mockRecipe);

      const result = await service.createBatch(batchData);

      expect(result).toHaveLength(2);
      expect(createFromParsedSpy).toHaveBeenCalledTimes(2);
    });
  });
});
