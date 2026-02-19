import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '@prisma/client';
import {
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
  CreateLabResultDto,
  ListLabOrdersDto,
  PatientLabOrdersDto,
} from './dto/lab-results.dto';

@Injectable()
export class LabResultsService {
  private readonly logger = new Logger(LabResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lab Orders
  // ---------------------------------------------------------------------------

  /**
   * Create a new lab order. Only practitioners may create orders.
   */
  async createOrder(practitionerId: string, dto: CreateLabOrderDto) {
    // Validate patient exists and is a PATIENT role
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.role !== 'PATIENT') {
      throw new BadRequestException('The specified user is not a patient');
    }

    // Validate diagnosticTest exists and is active
    const diagnosticTest = await this.prisma.diagnosticTest.findUnique({
      where: { id: dto.diagnosticTestId },
      select: { id: true, name: true, isActive: true },
    });

    if (!diagnosticTest) {
      throw new NotFoundException('Diagnostic test not found');
    }

    if (!diagnosticTest.isActive) {
      throw new BadRequestException('Diagnostic test is not active');
    }

    // If bookingId provided, validate it exists
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { id: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
    }

    // Create LabOrder with status ORDERED
    const labOrder = await this.prisma.labOrder.create({
      data: {
        patientId: dto.patientId,
        practitionerId,
        diagnosticTestId: dto.diagnosticTestId,
        bookingId: dto.bookingId,
        priority: dto.priority,
        clinicalNotes: dto.clinicalNotes,
        status: 'ORDERED',
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        diagnosticTest: true,
      },
    });

    // Send notification to patient
    await this.notificationsService.sendToUser(
      dto.patientId,
      'LAB_ORDER_CREATED',
      'Lab Test Ordered',
      `A lab test has been ordered for you: ${diagnosticTest.name}`,
      NotificationChannel.PUSH,
      { labOrderId: labOrder.id },
    );

    this.logger.log(
      `Lab order ${labOrder.id} created by practitioner ${practitionerId} for patient ${dto.patientId}`,
    );

    return labOrder;
  }

  /**
   * Get a single lab order by ID. Verifies that the requesting user is
   * either the patient or the practitioner on the order.
   */
  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        diagnosticTest: true,
        results: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify userId is patient or practitioner on the order
    if (order.patientId !== userId && order.practitionerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this lab order',
      );
    }

    return order;
  }

  /**
   * Update the status of a lab order. Only the ordering practitioner may
   * update status. Validates allowed status transitions.
   */
  async updateOrderStatus(
    practitionerId: string,
    orderId: string,
    dto: UpdateLabOrderStatusDto,
  ) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        practitionerId: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    if (order.practitionerId !== practitionerId) {
      throw new ForbiddenException(
        'You do not have permission to update this lab order',
      );
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      ORDERED: ['SAMPLE_COLLECTED', 'CANCELLED'],
      SAMPLE_COLLECTED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}`,
      );
    }

    // Build update data with appropriate timestamps
    const updateData: any = { status: dto.status };

    if (dto.status === 'SAMPLE_COLLECTED') {
      updateData.sampleCollectedAt = new Date();
    } else if (dto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (dto.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = dto.cancelledReason;
    }

    const updatedOrder = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        diagnosticTest: true,
      },
    });

    this.logger.log(
      `Lab order ${orderId} status updated from ${order.status} to ${dto.status}`,
    );

    return updatedOrder;
  }

  /**
   * List lab orders with pagination. Filters depend on the user's role:
   * - PATIENT: sees only their own orders
   * - Practitioner: sees orders they created (or filtered by patientId)
   */
  async listOrders(userId: string, role: string, params: ListLabOrdersDto) {
    const { page = 1, limit = 20, status, patientId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role === 'PATIENT') {
      where.patientId = userId;
    } else {
      // Practitioner role
      if (patientId) {
        where.patientId = patientId;
        where.practitionerId = userId;
      } else {
        where.practitionerId = userId;
      }
    }

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.labOrder.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
          diagnosticTest: {
            select: { id: true, name: true, code: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.labOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get lab orders for a specific patient with optional status filter and pagination.
   */
  async getOrdersByPatient(patientId: string, params: PatientLabOrdersDto) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { patientId };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.labOrder.findMany({
        where,
        include: {
          diagnosticTest: true,
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
          results: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.labOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Lab Results
  // ---------------------------------------------------------------------------

  /**
   * Create a lab result for an order. Auto-completes the order and sends
   * notifications. Critical results trigger additional alerts.
   */
  async createResult(practitionerId: string, dto: CreateLabResultDto) {
    // Find the lab order
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: dto.labOrderId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        diagnosticTest: {
          select: { id: true, name: true },
        },
      },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    // Verify practitionerId matches
    if (labOrder.practitionerId !== practitionerId) {
      throw new ForbiddenException(
        'You do not have permission to add results to this lab order',
      );
    }

    // Verify order status is PROCESSING or SAMPLE_COLLECTED
    if (labOrder.status !== 'PROCESSING' && labOrder.status !== 'SAMPLE_COLLECTED') {
      throw new BadRequestException(
        `Cannot add results to an order with status ${labOrder.status}. Order must be in PROCESSING or SAMPLE_COLLECTED status.`,
      );
    }

    // Create LabResult
    const labResult = await this.prisma.labResult.create({
      data: {
        labOrderId: dto.labOrderId,
        resultValue: dto.resultValue,
        resultUnit: dto.resultUnit,
        referenceRangeMin: dto.referenceRangeMin,
        referenceRangeMax: dto.referenceRangeMax,
        referenceRangeText: dto.referenceRangeText,
        interpretation: dto.interpretation,
        practitionerNotes: dto.practitionerNotes,
      },
      include: {
        labOrder: {
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
            practitioner: {
              select: { id: true, firstName: true, lastName: true },
            },
            diagnosticTest: true,
          },
        },
      },
    });

    // Auto-update order status to COMPLETED
    await this.prisma.labOrder.update({
      where: { id: dto.labOrderId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    const testName = labOrder.diagnosticTest.name;
    const patientName = `${labOrder.patient.firstName} ${labOrder.patient.lastName}`;

    // Send notification to patient: results ready
    await this.notificationsService.sendToUser(
      labOrder.patientId,
      'LAB_RESULT_AVAILABLE',
      'Lab Results Ready',
      `Your lab results for ${testName} are ready`,
      NotificationChannel.PUSH,
      { labOrderId: dto.labOrderId, labResultId: labResult.id },
    );

    // If interpretation is CRITICAL, send additional alerts
    if (dto.interpretation === 'CRITICAL') {
      // Notify practitioner
      await this.notificationsService.sendToUser(
        practitionerId,
        'CRITICAL_LAB_RESULT',
        'CRITICAL: Abnormal Lab Result',
        `CRITICAL: Abnormal result for ${testName} for patient ${patientName}`,
        NotificationChannel.PUSH,
        { labOrderId: dto.labOrderId, labResultId: labResult.id },
      );

      // Notify patient with critical alert
      await this.notificationsService.sendToUser(
        labOrder.patientId,
        'CRITICAL_LAB_RESULT',
        'CRITICAL Lab Result',
        `CRITICAL: Abnormal result for ${testName} — please contact your practitioner immediately`,
        NotificationChannel.PUSH,
        { labOrderId: dto.labOrderId, labResultId: labResult.id },
      );
    }

    this.logger.log(
      `Lab result ${labResult.id} created for order ${dto.labOrderId} (interpretation: ${dto.interpretation})`,
    );

    return labResult;
  }

  /**
   * Get a single lab result by ID. Verifies the requesting user is the
   * patient or practitioner on the associated order.
   */
  async getResult(userId: string, resultId: string) {
    const result = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: {
        labOrder: {
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
            practitioner: {
              select: { id: true, firstName: true, lastName: true },
            },
            diagnosticTest: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Lab result not found');
    }

    // Verify access
    if (
      result.labOrder.patientId !== userId &&
      result.labOrder.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this lab result',
      );
    }

    return result;
  }

  /**
   * Get all lab results for a patient with pagination.
   */
  async getResultsByPatient(
    patientId: string,
    params: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      labOrder: {
        patientId,
      },
    };

    const [results, total] = await Promise.all([
      this.prisma.labResult.findMany({
        where,
        include: {
          labOrder: {
            include: {
              diagnosticTest: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.labResult.count({ where }),
    ]);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get result trend for a specific diagnostic test for a patient.
   * Returns results in chronological order (oldest first) for charting.
   */
  async getResultTrend(patientId: string, diagnosticTestId: string) {
    const results = await this.prisma.labResult.findMany({
      where: {
        labOrder: {
          patientId,
          diagnosticTestId,
        },
      },
      include: {
        labOrder: {
          select: {
            id: true,
            orderedAt: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return results;
  }
}
