import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmergencyContactDto, TriggerPanicDto } from './dto/emergency.dto';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  /**
   * Zambian emergency numbers for quick reference.
   */
  private readonly ZAMBIAN_EMERGENCY_NUMBERS = [
    { service: 'Police (Zambia Police Service)', number: '999' },
    { service: 'Ambulance', number: '991' },
    { service: 'Fire Brigade', number: '993' },
    { service: 'Medical Emergency (UTH)', number: '+260211252641' },
    { service: 'Disaster Management (DMMU)', number: '116' },
    { service: 'Gender-Based Violence Hotline', number: '116' },
    { service: 'Drug Enforcement Commission', number: '+260211254529' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Trigger a panic alert. Notifies all emergency contacts and logs to audit trail.
   */
  async triggerPanic(userId: string, latitude: number, longitude: number, message?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        emergencyContacts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the panic trigger to audit trail
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PANIC_TRIGGERED',
        resourceType: 'EmergencyAlert',
        details: {
          latitude,
          longitude,
          message: message || 'Emergency panic button triggered',
          timestamp: new Date().toISOString(),
          contactsNotified: user.emergencyContacts.length,
        },
      },
    });

    // Create in-app notifications for all emergency contacts that are also users
    const notificationPromises = user.emergencyContacts.map(async (contact) => {
      // Try to find the contact as a user by phone number
      const contactUser = await this.prisma.user.findUnique({
        where: { phone: contact.phone },
      });

      if (contactUser) {
        await this.prisma.notification.create({
          data: {
            userId: contactUser.id,
            type: 'EMERGENCY_ALERT',
            title: 'Emergency Alert',
            body: `${user.firstName} ${user.lastName} has triggered an emergency panic alert. Location: ${latitude}, ${longitude}. ${message || ''}`.trim(),
            channel: 'PUSH',
            metadata: {
              triggeringUserId: userId,
              latitude,
              longitude,
              message,
            },
          },
        });
      }
    });

    await Promise.all(notificationPromises);

    this.logger.warn(
      `PANIC ALERT triggered by user ${userId} at ${latitude}, ${longitude}`,
    );

    return {
      message: 'Emergency alert sent successfully',
      contactsNotified: user.emergencyContacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      })),
      emergencyNumbers: this.ZAMBIAN_EMERGENCY_NUMBERS,
      location: { latitude, longitude },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List user's emergency contacts.
   */
  async getEmergencyContacts(userId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Add an emergency contact for a user.
   */
  async addEmergencyContact(userId: string, dto: EmergencyContactDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If this is marked as primary, unset any existing primary contact
    if (dto.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.emergencyContact.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
        isPrimary: dto.isPrimary || false,
      },
    });
  }

  /**
   * Update an emergency contact.
   */
  async updateEmergencyContact(
    userId: string,
    contactId: string,
    dto: EmergencyContactDto,
  ) {
    const contact = await this.prisma.emergencyContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this emergency contact',
      );
    }

    // If this is being set as primary, unset any existing primary contact
    if (dto.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: { userId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.emergencyContact.update({
      where: { id: contactId },
      data: {
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
        isPrimary: dto.isPrimary || false,
      },
    });
  }

  /**
   * Remove an emergency contact.
   */
  async removeEmergencyContact(userId: string, contactId: string) {
    const contact = await this.prisma.emergencyContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to remove this emergency contact',
      );
    }

    await this.prisma.emergencyContact.delete({
      where: { id: contactId },
    });

    return { message: 'Emergency contact removed successfully' };
  }

  /**
   * Return Zambian emergency numbers and nearest pharmacies.
   */
  async getNearbyEmergencyServices(latitude: number, longitude: number) {
    // Find nearest active pharmacies using Haversine formula
    const nearestPharmacies = await this.prisma.$queryRaw`
      SELECT
        p."id",
        p."name",
        p."address",
        p."city",
        p."phone",
        p."latitude",
        p."longitude",
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(p."latitude")) *
            cos(radians(p."longitude") - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(p."latitude"))
          ))
        )) AS distance
      FROM pharmacies p
      WHERE p."isActive" = true
        AND p."latitude" IS NOT NULL
        AND p."longitude" IS NOT NULL
      ORDER BY distance ASC
      LIMIT 5
    `;

    return {
      emergencyNumbers: this.ZAMBIAN_EMERGENCY_NUMBERS,
      nearestPharmacies: nearestPharmacies,
      location: { latitude, longitude },
    };
  }
}
