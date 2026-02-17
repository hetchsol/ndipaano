import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * Payload shape for notification jobs in the BullMQ queue.
 */
interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  metadata?: Record<string, any>;
}

/**
 * BullMQ processor for the 'notifications' queue.
 * Handles different notification delivery channels: push, SMS, email, and in-app.
 *
 * Each processor method is a stub that logs the notification details. In production,
 * these would be replaced with actual integrations (Expo Push, Africa's Talking,
 * SendGrid, etc.).
 */
@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  // ---------------------------------------------------------------------------
  // PUSH notifications
  // ---------------------------------------------------------------------------
  /**
   * Process push notifications.
   *
   * In production, this would use the Expo Push Notification API:
   *
   * ```typescript
   * import { Expo, ExpoPushMessage } from 'expo-server-sdk';
   *
   * const expo = new Expo();
   *
   * // Look up user's Expo push token from the database
   * const pushToken = await this.getUserPushToken(data.userId);
   *
   * if (Expo.isExpoPushToken(pushToken)) {
   *   const message: ExpoPushMessage = {
   *     to: pushToken,
   *     sound: 'default',
   *     title: data.title,
   *     body: data.body,
   *     data: data.metadata,
   *   };
   *
   *   const ticket = await expo.sendPushNotificationsAsync([message]);
   *   // Store ticket for receipt checking
   * }
   * ```
   */
  @Process('push')
  async handlePush(job: Job<NotificationJobData>) {
    const { data } = job;
    this.logger.log(
      `[PUSH] Sending push notification to user ${data.userId}: "${data.title}" - ${data.body}`,
    );
    this.logger.debug(
      `[PUSH] Notification ID: ${data.notificationId}, Type: ${data.type}, Metadata: ${JSON.stringify(data.metadata)}`,
    );

    // Stub: In production, integrate with Expo Push Notification API
    // See JSDoc comment above for implementation example
  }

  // ---------------------------------------------------------------------------
  // SMS notifications
  // ---------------------------------------------------------------------------
  /**
   * Process SMS notifications.
   *
   * In production, this would use Africa's Talking SMS API for Zambian numbers:
   *
   * ```typescript
   * import AfricasTalking from 'africastalking';
   *
   * const at = AfricasTalking({
   *   apiKey: process.env.AT_API_KEY,
   *   username: process.env.AT_USERNAME,
   * });
   * const sms = at.SMS;
   *
   * // Look up user's phone number from the database
   * const user = await this.prisma.user.findUnique({
   *   where: { id: data.userId },
   *   select: { phone: true },
   * });
   *
   * if (user?.phone) {
   *   const result = await sms.send({
   *     to: [user.phone],          // e.g. '+260971234567'
   *     message: `${data.title}\n${data.body}`,
   *     from: process.env.AT_SENDER_ID,  // Registered sender ID with ZICTA
   *   });
   *
   *   this.logger.log(`SMS sent: ${JSON.stringify(result)}`);
   *
   *   // Africa's Talking returns recipients array with:
   *   // - statusCode: 101 = sent, 401 = RiskHold, 402 = InvalidSenderId, etc.
   *   // - status: 'Success' or error description
   *   // - cost: e.g. 'ZMW 0.50'
   *   // - messageId: for tracking delivery
   *   for (const recipient of result.SMSMessageData.Recipients) {
   *     if (recipient.statusCode !== 101) {
   *       this.logger.error(
   *         `SMS delivery failed for ${recipient.number}: ${recipient.status}`
   *       );
   *     }
   *   }
   * }
   * ```
   *
   * Configuration required:
   * - AT_API_KEY: Africa's Talking API key
   * - AT_USERNAME: Africa's Talking username (use 'sandbox' for testing)
   * - AT_SENDER_ID: Registered sender ID (requires ZICTA approval for Zambia)
   *
   * Note: For WhatsApp notifications, Africa's Talking also provides a
   * WhatsApp Business API integration that works similarly.
   */
  @Process('sms')
  async handleSms(job: Job<NotificationJobData>) {
    const { data } = job;
    this.logger.log(
      `[SMS] Sending SMS notification to user ${data.userId}: "${data.title}" - ${data.body}`,
    );
    this.logger.debug(
      `[SMS] Notification ID: ${data.notificationId}, Type: ${data.type}, Metadata: ${JSON.stringify(data.metadata)}`,
    );

    // Stub: In production, integrate with Africa's Talking SMS API
    // See JSDoc comment above for implementation example
  }

  // ---------------------------------------------------------------------------
  // EMAIL notifications
  // ---------------------------------------------------------------------------
  /**
   * Process email notifications.
   *
   * In production, this would use SendGrid (or a similar transactional email provider):
   *
   * ```typescript
   * import sgMail from '@sendgrid/mail';
   *
   * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   *
   * // Look up user's email from the database
   * const user = await this.prisma.user.findUnique({
   *   where: { id: data.userId },
   *   select: { email: true, firstName: true },
   * });
   *
   * if (user?.email) {
   *   const msg = {
   *     to: user.email,
   *     from: {
   *       email: 'notifications@ndiipano.co.zm',
   *       name: 'Ndiipano Health',
   *     },
   *     subject: data.title,
   *     text: data.body,
   *     html: `
   *       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
   *         <div style="background: #0d9488; padding: 20px; text-align: center;">
   *           <h1 style="color: white; margin: 0;">Ndiipano</h1>
   *         </div>
   *         <div style="padding: 20px;">
   *           <p>Hello ${user.firstName},</p>
   *           <h2>${data.title}</h2>
   *           <p>${data.body}</p>
   *         </div>
   *         <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
   *           <p>Ndiipano Medical Home Care Platform</p>
   *           <p>Lusaka, Zambia</p>
   *         </div>
   *       </div>
   *     `,
   *     // For templated emails, use dynamic templates:
   *     // templateId: 'd-xxxxxxxxxxxxxxxxxxxxx',
   *     // dynamicTemplateData: {
   *     //   firstName: user.firstName,
   *     //   title: data.title,
   *     //   body: data.body,
   *     //   ...data.metadata,
   *     // },
   *   };
   *
   *   try {
   *     const [response] = await sgMail.send(msg);
   *     this.logger.log(`Email sent to ${user.email}: status ${response.statusCode}`);
   *   } catch (error) {
   *     this.logger.error(`Failed to send email to ${user.email}: ${error.message}`);
   *     throw error; // Re-throw so BullMQ retries the job
   *   }
   * }
   * ```
   *
   * Configuration required:
   * - SENDGRID_API_KEY: SendGrid API key
   * - Consider setting up dynamic templates in the SendGrid dashboard for
   *   consistent branding across all notification emails
   */
  @Process('email')
  async handleEmail(job: Job<NotificationJobData>) {
    const { data } = job;
    this.logger.log(
      `[EMAIL] Sending email notification to user ${data.userId}: "${data.title}" - ${data.body}`,
    );
    this.logger.debug(
      `[EMAIL] Notification ID: ${data.notificationId}, Type: ${data.type}, Metadata: ${JSON.stringify(data.metadata)}`,
    );

    // Stub: In production, integrate with SendGrid
    // See JSDoc comment above for implementation example
  }

  // ---------------------------------------------------------------------------
  // IN-APP notifications
  // ---------------------------------------------------------------------------
  /**
   * Process in-app notifications.
   * The notification is already persisted in the database by NotificationsService.send(),
   * so no additional action is needed here. This handler exists for logging and
   * potential future real-time WebSocket push functionality.
   */
  @Process('in-app')
  async handleInApp(job: Job<NotificationJobData>) {
    const { data } = job;
    this.logger.log(
      `[IN-APP] In-app notification ${data.notificationId} for user ${data.userId} already saved to database`,
    );

    // No additional processing needed for in-app notifications.
    // The record was already created in the database by NotificationsService.send().
    //
    // In the future, this could trigger a WebSocket event to push the notification
    // to connected clients in real-time:
    //
    // this.notificationsGateway.sendToUser(data.userId, {
    //   id: data.notificationId,
    //   type: data.type,
    //   title: data.title,
    //   body: data.body,
    //   metadata: data.metadata,
    // });
  }
}
