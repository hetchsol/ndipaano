import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';
import {
  SendNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Create a notification record in the database and add a job to the BullMQ
   * queue for asynchronous processing (push, SMS, email, etc.).
   */
  async send(dto: SendNotificationDto) {
    // Verify the target user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    // Create notification record in the database
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
        metadata: dto.metadata ?? undefined,
        sentAt: new Date(),
      },
    });

    // Determine the processing job name based on channel
    const jobName = this.getJobNameForChannel(dto.channel);

    // Add to BullMQ queue for async processing
    await this.notificationsQueue.add(jobName, {
      notificationId: notification.id,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      channel: dto.channel,
      metadata: dto.metadata,
    });

    this.logger.log(
      `Notification ${notification.id} created and queued (${jobName}) for user ${dto.userId}`,
    );

    return notification;
  }

  /**
   * Convenience method to send a notification to a specific user.
   */
  async sendToUser(
    userId: string,
    type: string,
    title: string,
    body: string,
    channel: NotificationChannel,
    metadata?: Record<string, any>,
  ) {
    return this.send({
      userId,
      type,
      title,
      body,
      channel,
      metadata,
    });
  }

  /**
   * Send appropriate notification based on booking event.
   * Handles different booking lifecycle events (requested, accepted, cancelled, etc.)
   */
  async sendBookingNotification(
    booking: {
      id: string;
      patientId: string;
      practitionerId: string;
      serviceType: string;
      scheduledAt: Date;
    },
    event:
      | 'requested'
      | 'accepted'
      | 'confirmed'
      | 'cancelled'
      | 'completed'
      | 'en_route'
      | 'in_progress'
      | 'no_show',
  ) {
    const notificationMap: Record<
      string,
      {
        recipientId: string;
        type: string;
        title: string;
        body: string;
      }
    > = {
      requested: {
        recipientId: booking.practitionerId,
        type: 'BOOKING_REQUESTED',
        title: 'New Booking Request',
        body: `You have a new ${booking.serviceType.replace(/_/g, ' ').toLowerCase()} booking request for ${new Date(booking.scheduledAt).toLocaleString()}.`,
      },
      accepted: {
        recipientId: booking.patientId,
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Accepted',
        body: `Your ${booking.serviceType.replace(/_/g, ' ').toLowerCase()} booking has been accepted and scheduled for ${new Date(booking.scheduledAt).toLocaleString()}.`,
      },
      confirmed: {
        recipientId: booking.patientId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed',
        body: `Your booking has been confirmed for ${new Date(booking.scheduledAt).toLocaleString()}.`,
      },
      cancelled: {
        recipientId: booking.patientId,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        body: `Your ${booking.serviceType.replace(/_/g, ' ').toLowerCase()} booking scheduled for ${new Date(booking.scheduledAt).toLocaleString()} has been cancelled.`,
      },
      completed: {
        recipientId: booking.patientId,
        type: 'BOOKING_COMPLETED',
        title: 'Visit Completed',
        body: `Your ${booking.serviceType.replace(/_/g, ' ').toLowerCase()} visit has been completed. Please leave a review for your practitioner.`,
      },
      en_route: {
        recipientId: booking.patientId,
        type: 'PRACTITIONER_EN_ROUTE',
        title: 'Practitioner On The Way',
        body: 'Your practitioner is on the way to your location.',
      },
      in_progress: {
        recipientId: booking.patientId,
        type: 'BOOKING_IN_PROGRESS',
        title: 'Visit In Progress',
        body: 'Your medical visit is now in progress.',
      },
      no_show: {
        recipientId: booking.practitionerId,
        type: 'BOOKING_NO_SHOW',
        title: 'Patient No-Show',
        body: `The patient did not show for the ${booking.serviceType.replace(/_/g, ' ').toLowerCase()} booking scheduled at ${new Date(booking.scheduledAt).toLocaleString()}.`,
      },
    };

    const config = notificationMap[event];
    if (!config) {
      this.logger.warn(`Unknown booking event: ${event}`);
      return;
    }

    return this.sendToUser(
      config.recipientId,
      config.type,
      config.title,
      config.body,
      NotificationChannel.PUSH,
      {
        bookingId: booking.id,
        event,
      },
    );
  }

  /**
   * Mark a single notification as read. Sets read = true and records readAt timestamp.
   * Verifies the notification belongs to the requesting user.
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this notification',
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread notifications as read for a given user.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      message: `${result.count} notification(s) marked as read`,
      count: result.count,
    };
  }

  /**
   * List a user's notifications with pagination and optional unread filter.
   */
  async getNotifications(userId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, unread } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unread !== undefined) {
      where.read = !unread;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Count unread notifications for a given user.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Soft delete a notification by removing it from the user's view.
   * We delete the record since the Notification model does not have a soft-delete
   * field; in production, consider adding a `deletedAt` column instead.
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this notification',
      );
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Map a NotificationChannel to the corresponding BullMQ job name.
   */
  private getJobNameForChannel(channel: NotificationChannel): string {
    switch (channel) {
      case NotificationChannel.PUSH:
        return 'push';
      case NotificationChannel.SMS:
        return 'sms';
      case NotificationChannel.EMAIL:
        return 'email';
      case NotificationChannel.WHATSAPP:
        return 'sms'; // WhatsApp handled alongside SMS in the queue
      case NotificationChannel.IN_APP:
        return 'in-app';
      default:
        return 'in-app';
    }
  }
}
