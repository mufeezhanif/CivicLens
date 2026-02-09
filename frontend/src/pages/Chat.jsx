import { ChatPanel } from '../components/Chat';

/**
 * Chat Page - Full-screen chat interface
 * Accessible to UC Chairmen, Town officials, Mayor, and Citizens
 * 
 * Roles:
 * - Citizens: Can only respond to conversations started by officials
 * - UC Chairman: Can start anonymous chats with citizens about complaints
 * - Town Official: Can chat with UC Chairmen and Mayor
 * - Mayor: Can chat with Town officials
 */
export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatPanel className="h-full" />
    </div>
  );
}
