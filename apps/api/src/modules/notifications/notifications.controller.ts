import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification.dto';
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../../common';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ---------------------------------------------------------------------------
  // GET /notifications
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'List own notifications',
    description:
      'Retrieves the authenticated user\'s notifications with pagination. ' +
      'Optionally filter by unread status.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getNotifications(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /notifications/unread-count
  // (must be above :id route to avoid param conflict)
  // ---------------------------------------------------------------------------
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Returns the number of unread notifications for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  // ---------------------------------------------------------------------------
  // PATCH /notifications/read-all
  // (must be above :id route to avoid param conflict)
  // ---------------------------------------------------------------------------
  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Marks all unread notifications as read for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  // ---------------------------------------------------------------------------
  // PATCH /notifications/:id/read
  // ---------------------------------------------------------------------------
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Marks a single notification as read. Only the notification owner can do this.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the notification' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  // ---------------------------------------------------------------------------
  // DELETE /notifications/:id
  // ---------------------------------------------------------------------------
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
    description:
      'Deletes a notification. Only the notification owner can do this.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }
}
