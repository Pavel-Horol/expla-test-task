export interface ClientToServerEvents {
  joinRoom: (data: { roomId: string }) => void;
  leaveRoom: (data: { roomId: string }) => void;
  sendMessage: (data: { roomId: string; content: string }) => void;
  typing: (data: { roomId: string; isTyping: boolean }) => void;
}

export interface ServerToClientEvents {
  newMessage: (data: {
    id: string;
    content: string;
    userId: string;
    username: string;
    roomId: string;
    createdAt: string;
  }) => void;
  userJoined: (data: { userId: string; username: string; roomId: string }) => void;
  userLeft: (data: { userId: string; username: string; roomId: string }) => void;
  userTyping: (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => void;
  error: (data: { message: string }) => void;
}

export interface SocketData {
  user: {
    userId: string;
    email: string;
    username?: string;
  };
}
