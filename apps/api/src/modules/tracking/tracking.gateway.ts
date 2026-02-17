import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingService } from './tracking.service';
import { BookingStatus, UserRole } from '@prisma/client';

/**
 * Practitioner roles from the Prisma UserRole enum.
 */
const PRACTITIONER_ROLES: UserRole[] = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
];

/**
 * Payload structure for the authenticated user extracted from the JWT.
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Payload for location update messages from practitioners.
 */
interface UpdateLocationPayload {
  bookingId: string;
  lat: number;
  lng: number;
}

/**
 * Payload for booking subscription messages from patients.
 */
interface SubscribeBookingPayload {
  bookingId: string;
}

@WebSocketGateway({
  namespace: 'tracking',
  cors: {
    origin: '*',
  },
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  /**
   * Map of socket ID -> authenticated user data.
   * Used to track which user is connected on which socket.
   */
  private connectedUsers = new Map<string, AuthenticatedUser>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly trackingService: TrackingService,
  ) {}

  // ===========================================================================
  // Connection Lifecycle
  // ===========================================================================

  /**
   * Handle new WebSocket connections.
   * Extracts and verifies the JWT from the handshake auth object.
   * Disconnects the client if authentication fails.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without a token`,
        );
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn(
          `Client ${client.id} provided an invalid token`,
        );
        client.emit('error', { message: 'Invalid or expired token' });
        client.disconnect();
        return;
      }

      // Store the authenticated user mapping
      this.connectedUsers.set(client.id, {
        id: payload.sub || payload.id,
        email: payload.email,
        role: payload.role,
      });

      this.logger.log(
        `Client connected: ${client.id} (User: ${payload.sub || payload.id}, Role: ${payload.role})`,
      );

      client.emit('connected', {
        message: 'Successfully connected to tracking service',
        userId: payload.sub || payload.id,
      });
    } catch (error) {
      this.logger.error(
        `Connection error for client ${client.id}: ${(error as Error).message}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnections.
   * Cleans up the user mapping for the disconnected client.
   */
  handleDisconnect(client: Socket): void {
    const user = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    this.logger.log(
      `Client disconnected: ${client.id}${user ? ` (User: ${user.id})` : ''}`,
    );
  }

  // ===========================================================================
  // updateLocation - Practitioner sends their GPS coordinates
  // ===========================================================================

  /**
   * Handle location updates from practitioners.
   * Validates:
   *   - The sender is a practitioner
   *   - The booking exists and belongs to the sender
   *   - The booking is in IN_PROGRESS or PRACTITIONER_EN_ROUTE status
   *
   * Updates the BookingTracking record and emits `locationUpdate`
   * to the patient's room for that booking.
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateLocationPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    // Validate the user is a practitioner
    if (!PRACTITIONER_ROLES.includes(user.role)) {
      throw new WsException('Only practitioners can send location updates');
    }

    // Validate payload
    if (!data.bookingId || data.lat == null || data.lng == null) {
      throw new WsException(
        'Invalid payload. Required fields: bookingId, lat, lng',
      );
    }

    // Validate lat/lng ranges
    if (data.lat < -90 || data.lat > 90) {
      throw new WsException('Latitude must be between -90 and 90');
    }
    if (data.lng < -180 || data.lng > 180) {
      throw new WsException('Longitude must be between -180 and 180');
    }

    // Fetch the booking and validate ownership and status
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        practitionerId: true,
        patientId: true,
        status: true,
        locationLat: true,
        locationLng: true,
      },
    });

    if (!booking) {
      throw new WsException(`Booking ${data.bookingId} not found`);
    }

    if (booking.practitionerId !== user.id) {
      throw new WsException(
        'You are not the assigned practitioner for this booking',
      );
    }

    if (
      booking.status !== BookingStatus.IN_PROGRESS &&
      booking.status !== BookingStatus.PRACTITIONER_EN_ROUTE
    ) {
      throw new WsException(
        `Cannot update location for booking with status "${booking.status}". ` +
        'Booking must be IN_PROGRESS or PRACTITIONER_EN_ROUTE.',
      );
    }

    // Update the tracking record
    const tracking = await this.trackingService.updateLocation(
      data.bookingId,
      data.lat,
      data.lng,
    );

    // Build the location update payload
    const locationUpdate = {
      bookingId: data.bookingId,
      lat: data.lat,
      lng: data.lng,
      estimatedArrivalMinutes: tracking.estimatedArrivalMinutes,
      updatedAt: tracking.updatedAt,
    };

    // Emit to the booking room so the patient receives the update
    const roomName = `booking:${data.bookingId}`;
    this.server.to(roomName).emit('locationUpdate', locationUpdate);

    this.logger.debug(
      `Location update emitted to room ${roomName}: (${data.lat}, ${data.lng})`,
    );

    return { event: 'locationUpdateAck', data: locationUpdate };
  }

  // ===========================================================================
  // subscribeBooking - Patient joins a booking room for live updates
  // ===========================================================================

  /**
   * Handle booking subscription requests from patients.
   * Validates that the requesting user is the patient on the booking,
   * then joins them to the `booking:${bookingId}` room to receive
   * live location updates.
   */
  @SubscribeMessage('subscribeBooking')
  async handleSubscribeBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeBookingPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.bookingId) {
      throw new WsException('bookingId is required');
    }

    // Verify the booking exists and belongs to this patient
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
        status: true,
      },
    });

    if (!booking) {
      throw new WsException(`Booking ${data.bookingId} not found`);
    }

    // Allow both patient and practitioner to subscribe
    if (booking.patientId !== user.id && booking.practitionerId !== user.id) {
      throw new WsException(
        'You are not authorized to subscribe to updates for this booking',
      );
    }

    const roomName = `booking:${data.bookingId}`;
    client.join(roomName);

    this.logger.log(
      `User ${user.id} subscribed to room ${roomName}`,
    );

    // Send current tracking data if available
    try {
      const currentLocation = await this.trackingService.getLocation(
        data.bookingId,
      );
      client.emit('locationUpdate', {
        bookingId: data.bookingId,
        lat: currentLocation.practitionerLat,
        lng: currentLocation.practitionerLng,
        estimatedArrivalMinutes: currentLocation.estimatedArrivalMinutes,
        updatedAt: currentLocation.updatedAt,
      });
    } catch {
      // No tracking data yet - this is normal for bookings that haven't started
    }

    return {
      event: 'subscribed',
      data: {
        bookingId: data.bookingId,
        room: roomName,
        message: `Subscribed to location updates for booking ${data.bookingId}`,
      },
    };
  }

  // ===========================================================================
  // unsubscribeBooking - Patient leaves a booking room
  // ===========================================================================

  /**
   * Handle booking unsubscription requests.
   * Removes the client from the `booking:${bookingId}` room.
   */
  @SubscribeMessage('unsubscribeBooking')
  async handleUnsubscribeBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeBookingPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.bookingId) {
      throw new WsException('bookingId is required');
    }

    const roomName = `booking:${data.bookingId}`;
    client.leave(roomName);

    this.logger.log(
      `User ${user.id} unsubscribed from room ${roomName}`,
    );

    return {
      event: 'unsubscribed',
      data: {
        bookingId: data.bookingId,
        room: roomName,
        message: `Unsubscribed from location updates for booking ${data.bookingId}`,
      },
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Extract the JWT token from the WebSocket handshake.
   * Supports both `auth.token` and `Authorization` header.
   */
  private extractToken(client: Socket): string | null {
    // Try auth object first (preferred method for Socket.IO)
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Fall back to Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Verify a JWT token and return the decoded payload.
   */
  private async verifyToken(token: string): Promise<any | null> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'ndipaano-jwt-secret-change-in-production');
      return await this.jwtService.verifyAsync(token, { secret });
    } catch {
      return null;
    }
  }

  /**
   * Get the authenticated user for a socket client.
   * Throws WsException if the client is not authenticated.
   */
  private getAuthenticatedUser(client: Socket): AuthenticatedUser {
    const user = this.connectedUsers.get(client.id);

    if (!user) {
      throw new WsException('Not authenticated');
    }

    return user;
  }
}
