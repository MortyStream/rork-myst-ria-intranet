export interface Message {
  id: string;
  senderId: string;
  content: string;
  conversationId: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name?: string;
  participants: string[];
  isGroup: boolean;
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}