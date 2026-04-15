jest.mock('../../prisma/prisma.service', () => {
  const mockIngredientMethods = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    PrismaService: class {
      ingredient = mockIngredientMethods;
      nutrition = {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      recipeIngredient = {
        findMany: jest.fn(),
      };
      $transaction = jest.fn((cb: (prisma: unknown) => unknown) => cb(this));
    },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { IngredientsService } from './ingredients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('IngredientsService', () => {
  let service: IngredientsService;
  let prismaMock: any;

  const mockIngredient = {
    id: 'ingredient-1',
    name: 'Tomato',
    normalized: 'tomato',
    nutrition: {
      id: 'nutrition-1',
      ingredientId: 'ingredient-1',
      caloriesPer100: 18,
      caloriesUnit: 'kcal',
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
    },
  };

  beforeEach(async () => {
    prismaMock = {
      ingredient: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      nutrition: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      recipeIngredient: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
  });

  describe('normalizeName', () => {
    it('should normalize ingredient name correctly', () => {
      const normalize = (service as any).normalizeName.bind(service);
      expect(normalize('  Tomato  ')).toBe('tomato');
      expect(normalize('Tomato   Sauce')).toBe('tomato sauce');
      expect(normalize('  Pineapple  ')).toBe('pineapple');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing ingredient for exact match', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(mockIngredient);

      const result = await service.findOrCreate('tomato');

      expect(result).toEqual(mockIngredient);
      expect(prismaMock.ingredient.findUnique).toHaveBeenCalledWith({
        where: { normalized: 'tomato' },
        include: { nutrition: true },
      });
    });

    it('should create new ingredient when no match found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);
      prismaMock.ingredient.findMany.mockResolvedValue([]);
      prismaMock.ingredient.create.mockResolvedValue({
        id: 'new-ingredient',
        name: 'New Ingredient',
        normalized: 'new ingredient',
        nutrition: null,
      });

      const result = await service.findOrCreate('New Ingredient');

      expect(result!.normalized).toBe('new ingredient');
      expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
        data: { name: 'New Ingredient', normalized: 'new ingredient' },
        include: { nutrition: true },
      });
    });
  });

  describe('getNutrition', () => {
    it('should return nutrition data for ingredient', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(mockIngredient);

      const result = await service.getNutrition('ingredient-1');

      expect(result).toEqual(mockIngredient.nutrition);
    });

    it('should throw NotFoundException if ingredient not found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(service.getNutrition('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if nutrition not found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        nutrition: null,
      });

      await expect(service.getNutrition('ingredient-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addNutrition', () => {
    const nutritionData = {
      caloriesPer100: 50,
      protein: 5,
      carbs: 10,
      fat: 2,
      fiber: 3,
    };

    it('should add nutrition to ingredient', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        nutrition: null,
      });
      prismaMock.nutrition.create.mockResolvedValue({
        id: 'nutrition-new',
        ingredientId: 'ingredient-1',
        ...nutritionData,
        caloriesUnit: 'kcal',
      });

      const result = await service.addNutrition('ingredient-1', nutritionData);

      expect(result.caloriesPer100).toBe(50);
      expect(prismaMock.nutrition.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if nutrition already exists', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(mockIngredient);

      await expect(
        service.addNutrition('ingredient-1', nutritionData),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if ingredient not found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(
        service.addNutrition('invalid-id', nutritionData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateNutrition', () => {
    const nutritionData = { caloriesPer100: 100, protein: 10 };

    it('should update nutrition data', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(mockIngredient);
      prismaMock.nutrition.update.mockResolvedValue({
        ...mockIngredient.nutrition,
        ...nutritionData,
      });

      const result = await service.updateNutrition(
        'ingredient-1',
        nutritionData,
      );

      expect(result.caloriesPer100).toBe(100);
      expect(prismaMock.nutrition.update).toHaveBeenCalledWith({
        where: { ingredientId: 'ingredient-1' },
        data: nutritionData,
      });
    });

    it('should throw NotFoundException if nutrition not found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        ...mockIngredient,
        nutrition: null,
      });

      await expect(
        service.updateNutrition('ingredient-1', nutritionData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete ingredient if not used in recipes', async () => {
      prismaMock.recipeIngredient.findMany.mockResolvedValue([]);
      prismaMock.ingredient.delete.mockResolvedValue(mockIngredient);

      await expect(service.remove('ingredient-1')).resolves.not.toThrow();
      expect(prismaMock.ingredient.delete).toHaveBeenCalledWith({
        where: { id: 'ingredient-1' },
      });
    });

    it('should throw ConflictException if ingredient is used in recipes', async () => {
      prismaMock.recipeIngredient.findMany.mockResolvedValue([
        { productId: 'ingredient-1', recipeId: 'recipe-1' },
      ]);

      await expect(service.remove('ingredient-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if ingredient not found', async () => {
      prismaMock.recipeIngredient.findMany.mockRejectedValue({
        code: 'P2025',
      });

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all ingredients', async () => {
      prismaMock.ingredient.findMany.mockResolvedValue([mockIngredient]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prismaMock.ingredient.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return single ingredient', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(mockIngredient);

      const result = await service.findOne('ingredient-1');

      expect(result).toEqual(mockIngredient);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create new ingredient', async () => {
      prismaMock.ingredient.create.mockResolvedValue(mockIngredient);

      const result = await service.create({ name: 'Tomato' });

      expect(result).toEqual(mockIngredient);
    });

    it('should throw ConflictException on duplicate', async () => {
      prismaMock.ingredient.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create({ name: 'Tomato' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update ingredient', async () => {
      const updatedIngredient = { ...mockIngredient, name: 'Cherry Tomato' };
      prismaMock.ingredient.update.mockResolvedValue(updatedIngredient);

      const result = await service.update('ingredient-1', {
        name: 'Cherry Tomato',
      });

      expect(result.name).toBe('Cherry Tomato');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.ingredient.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.update('invalid-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
