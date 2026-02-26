import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MedicationOrdersService } from './medication-orders.service';
import { PharmacySearchDto } from './dto/medication-order.dto';

@ApiTags('Pharmacies')
@ApiBearerAuth('access-token')
@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly service: MedicationOrdersService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Search nearby pharmacies by city or coordinates' })
  @ApiResponse({ status: 200, description: 'Paginated list of pharmacies' })
  async searchNearby(@Query() query: PharmacySearchDto) {
    return this.service.searchNearbyPharmacies(query);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'List available inventory items for a pharmacy' })
  @ApiParam({ name: 'id', description: 'Pharmacy UUID' })
  @ApiResponse({ status: 200, description: 'List of available items' })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  async getInventory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPharmacyInventory(id);
  }
}
