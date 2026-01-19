import { useState } from "react";
import { Search, Send } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mockConversations = [
  {
    id: "1",
    user: { name: "John Kamau", avatar: null },
    property: "Modern 3BR Apartment",
    lastMessage: "Is this property still available?",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "2",
    user: { name: "Mary Wanjiku", avatar: null },
    property: "Luxury Villa with Pool",
    lastMessage: "Can I schedule a viewing for Saturday?",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: "3",
    user: { name: "Peter Ochieng", avatar: null },
    property: "Studio Apartment",
    lastMessage: "Thank you for the information!",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "4",
    user: { name: "Grace Muthoni", avatar: null },
    property: "Beach House",
    lastMessage: "What's the best price you can offer?",
    time: "2 days ago",
    unread: false,
  },
];

const mockMessages = [
  {
    id: 1,
    sender: "user",
    message: "Hello, I'm interested in the Modern 3BR Apartment in Westlands.",
    time: "10:30 AM",
  },
  {
    id: 2,
    sender: "me",
    message: "Hi John! Thank you for your interest. The apartment is still available. Would you like to schedule a viewing?",
    time: "10:32 AM",
  },
  {
    id: 3,
    sender: "user",
    message: "Yes, that would be great. Is this weekend possible?",
    time: "10:35 AM",
  },
  {
    id: 4,
    sender: "me",
    message: "Saturday works for me. How about 2 PM?",
    time: "10:36 AM",
  },
  {
    id: 5,
    sender: "user",
    message: "Is this property still available?",
    time: "Just now",
  },
];

const DashboardMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // TODO: Implement actual message sending
      setNewMessage("");
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Messages"
        description="Communicate with potential clients."
      />

      <div className="glass-card rounded-xl overflow-hidden h-[calc(100vh-220px)]">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mockConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "w-full p-4 text-left border-b border-border transition-colors",
                    selectedConversation.id === conversation.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-medium text-primary">
                        {conversation.user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conversation.user.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {conversation.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.property}
                      </p>
                      <p
                        className={cn(
                          "text-sm truncate mt-1",
                          conversation.unread ? "font-medium" : "text-muted-foreground"
                        )}
                      >
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {conversation.unread && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-medium text-primary">
                    {selectedConversation.user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Re: {selectedConversation.property}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "me" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      message.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.sender === "me"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-3">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMessages;
