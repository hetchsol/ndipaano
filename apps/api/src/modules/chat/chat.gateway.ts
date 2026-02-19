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
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageType, NotificationChannel, UserRole } from '@prisma/client';

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
 * Payload for joining/leaving a conversation room.
 */
interface ConversationPayload {
  conversationId: string;
}

/**
 * Payload for sending a message via WebSocket.
 */
interface SendMessagePayload {
  conversationId: string;
  type?: MessageType;
  content: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Payload for typing indicator events.
 */
interface TypingPayload {
  conversationId: string;
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

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
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
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
        message: 'Successfully connected to chat service',
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
  // joinConversation - User joins a conversation room
  // ===========================================================================

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConversationPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.conversationId) {
      throw new WsException('conversationId is required');
    }

    // Verify the user is a participant in this conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: { id: true, patientId: true, practitionerId: true },
    });

    if (!conversation) {
      throw new WsException(`Conversation ${data.conversationId} not found`);
    }

    if (
      conversation.patientId !== user.id &&
      conversation.practitionerId !== user.id
    ) {
      throw new WsException(
        'You are not a participant in this conversation',
      );
    }

    const roomName = `conversation:${data.conversationId}`;
    client.join(roomName);

    this.logger.log(
      `User ${user.id} joined room ${roomName}`,
    );

    return {
      event: 'joinedConversation',
      data: {
        conversationId: data.conversationId,
        room: roomName,
        message: `Joined conversation ${data.conversationId}`,
      },
    };
  }

  // ===========================================================================
  // leaveConversation - User leaves a conversation room
  // ===========================================================================

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConversationPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.conversationId) {
      throw new WsException('conversationId is required');
    }

    const roomName = `conversation:${data.conversationId}`;
    client.leave(roomName);

    this.logger.log(
      `User ${user.id} left room ${roomName}`,
    );

    return {
      event: 'leftConversation',
      data: {
        conversationId: data.conversationId,
        room: roomName,
        message: `Left conversation ${data.conversationId}`,
      },
    };
  }

  // ===========================================================================
  // sendMessage - Send a chat message
  // ===========================================================================

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.conversationId || !data.content) {
      throw new WsException('conversationId and content are required');
    }

    // Persist the message via the chat service
    const message = await this.chatService.sendMessage(
      data.conversationId,
      user.id,
      {
        type: data.type,
        content: data.content,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    );

    // Broadcast the new message to the conversation room
    const roomName = `conversation:${data.conversationId}`;
    this.server.to(roomName).emit('newMessage', message);

    // Determine the recipient and send push notification if they are offline
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: { patientId: true, practitionerId: true },
    });

    if (conversation) {
      const recipientId =
        conversation.patientId === user.id
          ? conversation.practitionerId
          : conversation.patientId;

      // Check if the recipient is online (has active sockets)
      const recipientSockets = this.userSockets.get(recipientId);
      const isRecipientOnline =
        recipientSockets !== undefined && recipientSockets.size > 0;

      if (!isRecipientOnline) {
        // Send push notification for offline user
        try {
          await this.notificationsService.sendToUser(
            recipientId,
            'CHAT_MESSAGE',
            'New Message',
            `${user.firstName || 'Someone'}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
            NotificationChannel.PUSH,
            {
              conversationId: data.conversationId,
              senderId: user.id,
              messageType: data.type || MessageType.TEXT,
            },
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send push notification to user ${recipientId}: ${(error as Error).message}`,
          );
        }
      }
    }

    return { event: 'messageSent', data: message };
  }

  // ===========================================================================
  // typing - Broadcast typing indicator
  // ===========================================================================

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ): Promise<void> {
    const user = this.getAuthenticatedUser(client);

    if (!data.conversationId) {
      throw new WsException('conversationId is required');
    }

    const roomName = `conversation:${data.conversationId}`;

    // Broadcast typing indicator to the room, excluding the sender
    client.to(roomName).emit('userTyping', {
      userId: user.id,
      firstName: user.firstName,
    });
  }

  // ===========================================================================
  // markRead - Mark messages as read
  // ===========================================================================

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ConversationPayload,
  ): Promise<{ event: string; data: any }> {
    const user = this.getAuthenticatedUser(client);

    if (!data.conversationId) {
      throw new WsException('conversationId is required');
    }

    // Persist the read status via the chat service
    const result = await this.chatService.markAsRead(
      data.conversationId,
      user.id,
    );

    // Broadcast the read receipt to the conversation room
    const roomName = `conversation:${data.conversationId}`;
    this.server.to(roomName).emit('messagesRead', {
      conversationId: data.conversationId,
      userId: user.id,
    });

    return { event: 'markedAsRead', data: result };
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
