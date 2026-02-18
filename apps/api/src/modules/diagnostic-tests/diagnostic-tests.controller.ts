import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PractitionerType } from '@prisma/client';
import { DiagnosticTestsService } from './diagnostic-tests.service';
import { Public } from '../../common';
import { SearchDiagnosticTestsDto } from './dto/diagnostic-tests.dto';

@ApiTags('Diagnostic Tests')
@Controller('diagnostic-tests')
export class DiagnosticTestsController {
  constructor(
    private readonly diagnosticTestsService: DiagnosticTestsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search and list diagnostic tests' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of diagnostic tests',
  })
  async search(@Query() query: SearchDiagnosticTestsDto) {
    return this.diagnosticTestsService.search(query);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List diagnostic test categories with counts' })
  @ApiResponse({
    status: 200,
    description: 'List of categories with test counts',
  })
  async getCategories() {
    return this.diagnosticTestsService.getCategories();
  }

  @Get('by-practitioner-type/:type')
  @Public()
  @ApiOperation({
    summary: 'Get diagnostic tests grouped by category for a practitioner type',
  })
  @ApiParam({
    name: 'type',
    description: 'Practitioner type enum value',
    enum: PractitionerType,
  })
  @ApiResponse({
    status: 200,
    description: 'Tests grouped by category for the given practitioner type',
  })
  async getByPractitionerType(
    @Param('type') type: PractitionerType,
  ) {
    return this.diagnosticTestsService.getByPractitionerType(type);
  }
}
