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
import { SessionSignalDto } from './dto/telehealth.dto';
import { UserRole } from '@prisma/client';

/**
 * Payload structure for the authenticated user extracted from the JWT.
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
}

/**
 * Payload for joining/leaving a session room.
 */
interface SessionPayload {
  sessionId: string;
}

/**
 * Payload for broadcasting session status changes.
 */
interface SessionStatusPayload {
  sessionId: string;
  status: string;
}

@WebSocketGateway({
  namespace: 'telehealth',
  cors: {
    origin: '*',
  },
})
export class TelehealthGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelehealthGateway.name);

  /**
   * Map of socket ID -> authenticated user data.
   * Used to track which user is connected on which socket.
   */
  private connectedUsers = new Map<string, AuthenticatedUser>();

  /**
   * Map of user ID -> Set of socket IDs.
   * Supports multi-device connections for the same user.
   */
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

      const userId = payload.sub || payload.id;

      // Store the authenticated user mapping
      this.connectedUsers.set(client.id, {
        id: userId,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
      });

      // Track multi-device sockets for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(
        `Client connected: ${client.id} (User: ${userId}, Role: ${payload.role})`,
      );

      client.emit('connected', {
        message: 'Successfully connected to telehealth service',
        userId,
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
   * Cleans up the user mapping and socket tracking for the disconnected client.
   */
  handleDisconnect(client: Socket): void {
    const user = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);

    if (user) {
      const sockets = this.userSockets.get(user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(user.id);
        }
      }
    }

    this.logger.log(
      `Client disconnected: ${client.id}${user ? ` (User: ${user.id})` : ''}`,
    );
  }

  // ===========================================================================
  // joinSession - User joins a telehealth session room
  // ===========================================================================

  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.sessionId) {
      throw new WsException('sessionId is required');
    }

    // Verify the user is a participant in this session via the booking
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id: data.sessionId },
      include: {
        booking: {
          select: { id: true, patientId: true, practitionerId: true },
        },
      },
    });

    if (!session) {
      throw new WsException(`Telehealth session ${data.sessionId} not found`);
    }

    if (
      session.booking.patientId !== user.id &&
      session.booking.practitionerId !== user.id
    ) {
      throw new WsException(
        'You are not a participant in this telehealth session',
      );
    }

    const roomName = `session:${data.sessionId}`;
    client.join(roomName);

    this.logger.log(
      `User ${user.id} joined room ${roomName}`,
    );

    return {
      event: 'joinedSession',
      data: {
        sessionId: data.sessionId,
        room: roomName,
        message: `Joined telehealth session ${data.sessionId}`,
      },
    };
  }

  // ===========================================================================
  // leaveSession - User leaves a telehealth session room
  // ===========================================================================

  @SubscribeMessage('leaveSession')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.sessionId) {
      throw new WsException('sessionId is required');
    }

    const roomName = `session:${data.sessionId}`;
    client.leave(roomName);

    this.logger.log(
      `User ${user.id} left room ${roomName}`,
    );

    return {
      event: 'leftSession',
      data: {
        sessionId: data.sessionId,
        room: roomName,
        message: `Left telehealth session ${data.sessionId}`,
      },
    };
  }

  // ===========================================================================
  // signal - WebRTC signaling (offer, answer, ice-candidate)
  // ===========================================================================

  @SubscribeMessage('signal')
  async handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionSignalDto,
  ): Promise<void> {
    const user = this.getAuthenticatedUser(client);

    if (!data.type || !data.targetUserId) {
      throw new WsException('type and targetUserId are required');
    }

    // Find the target user's sockets
    const targetSockets = this.userSockets.get(data.targetUserId);

    if (!targetSockets || targetSockets.size === 0) {
      this.logger.warn(
        `Signal target user ${data.targetUserId} is not connected`,
      );
      return;
    }

    // Emit the signal to all of the target user's sockets
    for (const socketId of targetSockets) {
      this.server.to(socketId).emit('signal', {
        type: data.type,
        payload: data.payload,
        fromUserId: user.id,
      });
    }

    this.logger.log(
      `Signal ${data.type} sent from ${user.id} to ${data.targetUserId}`,
    );
  }

  // ===========================================================================
  // sessionStatusChanged - Broadcast status updates to session room
  // ===========================================================================

  @SubscribeMessage('sessionStatusChanged')
  async handleSessionStatusChanged(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SessionStatusPayload,
  ): Promise<void> {
    const user = this.getAuthenticatedUser(client);

    if (!data.sessionId || !data.status) {
      throw new WsException('sessionId and status are required');
    }

    const roomName = `session:${data.sessionId}`;

    this.server.to(roomName).emit('sessionStatusChanged', {
      sessionId: data.sessionId,
      status: data.status,
      updatedBy: user.id,
    });

    this.logger.log(
      `Session ${data.sessionId} status changed to ${data.status} by user ${user.id}`,
    );
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
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'ndipaano-jwt-secret-change-in-production',
      );
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
