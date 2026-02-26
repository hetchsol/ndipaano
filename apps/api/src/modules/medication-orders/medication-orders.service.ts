import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel, Prisma } from '@prisma/client';
import {
  CreateMedicationOrderDto,
  MedicationOrderQueryDto,
  CancelMedicationOrderDto,
  PharmacySearchDto,
} from './dto/medication-order.dto';

@Injectable()
export class MedicationOrdersService {
  private readonly logger = new Logger(MedicationOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // Medication Orders
  // ===========================================================================

  async create(patientUserId: string, dto: CreateMedicationOrderDto) {
    // 1. Verify prescription belongs to patient and is not dispensed
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: dto.prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.patientId !== patientUserId) {
      throw new ForbiddenException('This prescription does not belong to you');
    }
    if (prescription.dispensed) {
      throw new BadRequestException('This prescription has already been dispensed');
    }

    // 2. Verify pharmacy exists and is active
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: dto.pharmacyId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }
    if (!pharmacy.isActive) {
      throw new BadRequestException('This pharmacy is not currently active');
    }

    // 3. Look up PharmacyInventory matching prescription's medicationName
    const inventoryItem = await this.prisma.pharmacyInventory.findFirst({
      where: {
        pharmacyId: dto.pharmacyId,
        medicationName: { equals: prescription.medicationName, mode: 'insensitive' },
        isAvailable: true,
      },
    });

    if (!inventoryItem) {
      throw new BadRequestException(
        `"${prescription.medicationName}" is not available at this pharmacy`,
      );
    }

    // 4. Verify stock available
    const quantity = prescription.quantity || 1;
    if (inventoryItem.quantityInStock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${inventoryItem.quantityInStock}, Needed: ${quantity}`,
      );
    }

    // 5. Calculate totalAmount
    const unitPrice = Number(inventoryItem.unitPrice);
    const totalAmount = unitPrice * quantity;

    // 6. Create MedicationOrder
    const order = await this.prisma.medicationOrder.create({
      data: {
        prescriptionId: dto.prescriptionId,
        patientId: patientUserId,
        pharmacyId: dto.pharmacyId,
        quantity,
        unitPrice: inventoryItem.unitPrice,
        totalAmount,
        deliveryAddress: dto.deliveryAddress,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
      },
      include: {
        prescription: true,
        pharmacy: { select: { id: true, name: true, address: true, city: true, phone: true } },
      },
    });

    // 7. Send notification to patient
    try {
      await this.notificationsService.send({
        userId: patientUserId,
        type: 'MEDICATION_ORDER_CREATED',
        title: 'Medication Order Placed',
        body: `Your order for ${prescription.medicationName} has been placed at ${pharmacy.name}.`,
        channel: NotificationChannel.IN_APP,
        metadata: { orderId: order.id },
      });
    } catch (err) {
      this.logger.warn(`Failed to send order notification: ${err}`);
    }

    this.logger.log(`Medication order created: ${order.id} by patient ${patientUserId}`);
    return order;
  }

  async findByPatient(patientUserId: string, query: MedicationOrderQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicationOrderWhereInput = { patientId: patientUserId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.medicationOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          prescription: {
            select: {
              id: true,
              medicationName: true,
              dosage: true,
              frequency: true,
              quantity: true,
            },
          },
          pharmacy: {
            select: { id: true, name: true, address: true, city: true, phone: true },
          },
        },
      }),
      this.prisma.medicationOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, requestingUserId: string) {
    const order = await this.prisma.medicationOrder.findUnique({
      where: { id },
      include: {
        prescription: {
          select: {
            id: true,
            medicationName: true,
            dosage: true,
            frequency: true,
            duration: true,
            quantity: true,
            notes: true,
          },
        },
        pharmacy: {
          select: { id: true, name: true, address: true, city: true, phone: true, email: true },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Medication order not found');
    }

    // Access control: patient, admin, or pharmacist
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true },
    });

    const isPatient = order.patientId === requestingUserId;
    const isAdmin = requestingUser?.role === 'ADMIN' || requestingUser?.role === 'SUPER_ADMIN';
    const isPharmacist = requestingUser?.role === 'PHARMACIST';

    if (!isPatient && !isAdmin && !isPharmacist) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }

  async confirm(id: string) {
    const order = await this.prisma.medicationOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Medication order not found');
    if (order.status !== 'PENDING') {
      throw new BadRequestException(`Cannot confirm order with status ${order.status}`);
    }

    const updated = await this.prisma.medicationOrder.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    this.sendStatusNotification(order.patientId, id, 'Medication Order Confirmed', 'Your medication order has been confirmed by the pharmacy.');
    return updated;
  }

  async markReady(id: string) {
    const order = await this.prisma.medicationOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Medication order not found');
    if (order.status !== 'CONFIRMED' && order.status !== 'PREPARING') {
      throw new BadRequestException(`Cannot mark ready from status ${order.status}`);
    }

    const updated = await this.prisma.medicationOrder.update({
      where: { id },
      data: { status: 'READY', readyAt: new Date() },
    });

    this.sendStatusNotification(order.patientId, id, 'Medication Ready', 'Your medication is ready for pickup/delivery.');
    return updated;
  }

  async dispatch(id: string) {
    const order = await this.prisma.medicationOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Medication order not found');
    if (order.status !== 'READY') {
      throw new BadRequestException(`Cannot dispatch order with status ${order.status}`);
    }

    const updated = await this.prisma.medicationOrder.update({
      where: { id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date() },
    });

    this.sendStatusNotification(order.patientId, id, 'Medication Dispatched', 'Your medication is on its way.');
    return updated;
  }

  async deliver(id: string) {
    const order = await this.prisma.medicationOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Medication order not found');
    if (order.status !== 'DISPATCHED') {
      throw new BadRequestException(`Cannot deliver order with status ${order.status}`);
    }

    // Decrement inventory stock and mark prescription dispensed in a transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.medicationOrder.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: new Date(), paymentStatus: 'COMPLETED' },
      });

      // Decrement inventory stock
      await tx.pharmacyInventory.updateMany({
        where: {
          pharmacyId: order.pharmacyId,
          medicationName: {
            equals: (await tx.prescription.findUnique({ where: { id: order.prescriptionId } }))!.medicationName,
            mode: 'insensitive',
          },
        },
        data: { quantityInStock: { decrement: order.quantity } },
      });

      // Mark prescription as dispensed
      await tx.prescription.update({
        where: { id: order.prescriptionId },
        data: { dispensed: true, dispensedAt: new Date() },
      });

      return updatedOrder;
    });

    this.sendStatusNotification(order.patientId, id, 'Medication Delivered', 'Your medication has been delivered.');
    return updated;
  }

  async cancel(id: string, userId: string, dto: CancelMedicationOrderDto) {
    const order = await this.prisma.medicationOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Medication order not found');

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    // Verify access: patient who placed it, admin, or pharmacist
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isPatient = order.patientId === userId;
    const isAdmin = requestingUser?.role === 'ADMIN' || requestingUser?.role === 'SUPER_ADMIN';
    const isPharmacist = requestingUser?.role === 'PHARMACIST';

    if (!isPatient && !isAdmin && !isPharmacist) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    const updated = await this.prisma.medicationOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledBy: userId,
        cancelledReason: dto.reason,
        cancelledAt: new Date(),
      },
    });

    this.sendStatusNotification(order.patientId, id, 'Medication Order Cancelled', 'Your medication order has been cancelled.');
    return updated;
  }

  // ===========================================================================
  // Pharmacy Search (public, authenticated)
  // ===========================================================================

  async searchNearbyPharmacies(query: PharmacySearchDto) {
    const { city, latitude, longitude, radiusKm = 25, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // If lat/lng provided, use Haversine raw SQL
    if (latitude !== undefined && longitude !== undefined) {
      const distanceFormula = `
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(p.latitude))
          * cos(radians(p.longitude) - radians(${longitude}))
          + sin(radians(${latitude})) * sin(radians(p.latitude))
        )
      `;

      const data = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          p.id, p.name, p.address, p.city, p.province,
          p.latitude, p.longitude, p.phone, p.email,
          ${distanceFormula} AS "distanceKm"
        FROM pharmacies p
        WHERE p."isActive" = true
          AND p.latitude IS NOT NULL
          AND p.longitude IS NOT NULL
          AND ${distanceFormula} <= $1
        ORDER BY ${distanceFormula} ASC
        LIMIT $2 OFFSET $3
      `, radiusKm, limit, skip);

      const countResult = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int AS total
        FROM pharmacies p
        WHERE p."isActive" = true
          AND p.latitude IS NOT NULL
          AND p.longitude IS NOT NULL
          AND ${distanceFormula} <= $1
      `, radiusKm);

      const total = countResult[0]?.total ?? 0;
      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // Fallback: filter by city or list all active pharmacies
    const where: Prisma.PharmacyWhereInput = { isActive: true };
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.pharmacy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          province: true,
          latitude: true,
          longitude: true,
          phone: true,
          email: true,
        },
      }),
      this.prisma.pharmacy.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPharmacyInventory(pharmacyId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    return this.prisma.pharmacyInventory.findMany({
      where: { pharmacyId, isAvailable: true, quantityInStock: { gt: 0 } },
      orderBy: { medicationName: 'asc' },
      select: {
        id: true,
        medicationName: true,
        genericName: true,
        unitPrice: true,
        quantityInStock: true,
      },
    });
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async sendStatusNotification(
    userId: string,
    orderId: string,
    title: string,
    body: string,
  ) {
    try {
      await this.notificationsService.send({
        userId,
        type: 'MEDICATION_ORDER_STATUS',
        title,
        body,
        channel: NotificationChannel.IN_APP,
        metadata: { orderId },
      });
    } catch (err) {
      this.logger.warn(`Failed to send order status notification: ${err}`);
    }
  }
}
