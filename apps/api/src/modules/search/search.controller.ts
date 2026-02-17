import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common';
import { SearchPractitionersDto, SearchPharmaciesDto } from './dto/search.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('practitioners')
  @Public()
  @ApiOperation({
    summary: 'Search for practitioners with filters and location',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of practitioners matching search criteria',
  })
  async searchPractitioners(@Query() query: SearchPractitionersDto) {
    return this.searchService.searchPractitioners(query);
  }

  @Get('pharmacies')
  @Public()
  @ApiOperation({ summary: 'Search for pharmacies by location and name' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pharmacies matching search criteria',
  })
  async searchPharmacies(@Query() query: SearchPharmaciesDto) {
    return this.searchService.searchPharmacies(query);
  }

  @Get('service-types')
  @Public()
  @ApiOperation({ summary: 'List all available service types' })
  @ApiResponse({
    status: 200,
    description: 'List of service types with descriptions',
  })
  async getServiceTypes() {
    return this.searchService.getServiceTypes();
  }
}
