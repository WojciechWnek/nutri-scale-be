import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateIngredientNutritionDto } from './dto/create-ingredient-nutrition.dto';
import { UpdateIngredientNutritionDto } from './dto/update-ingredient-nutrition.dto';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  create(@Body() createIngredientDto: CreateIngredientDto) {
    return this.ingredientsService.create(createIngredientDto);
  }

  @Get()
  findAll() {
    return this.ingredientsService.findAll();
  }

  @Get('search')
  findByName(@Query('name') name: string) {
    return this.ingredientsService.findByName(name);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(id, updateIngredientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }

  // Nutrition endpoints - nested under ingredient
  @Get(':id/nutrition')
  getNutrition(@Param('id') id: string) {
    return this.ingredientsService.getNutrition(id);
  }

  @Post(':id/nutrition')
  addNutrition(
    @Param('id') id: string,
    @Body() nutritionData: CreateIngredientNutritionDto,
  ) {
    return this.ingredientsService.addNutrition(id, nutritionData);
  }

  @Patch(':id/nutrition')
  updateNutrition(
    @Param('id') id: string,
    @Body() nutritionData: UpdateIngredientNutritionDto,
  ) {
    return this.ingredientsService.updateNutrition(id, nutritionData);
  }

  @Delete(':id/nutrition')
  removeNutrition(@Param('id') id: string) {
    return this.ingredientsService.removeNutrition(id);
  }
}
