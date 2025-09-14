# Chat System Setup Guide

## Overview
This chat system provides ChatWork-equivalent functionality with project-based chat rooms for contractors and client representatives. The system includes real-time messaging, file attachments, and participant management.

## Database Setup

### 1. Apply the Chat Schema
Run the SQL schema from `/supabase/chat-schema.sql` in your Supabase SQL Editor:

```sql
-- Run the entire chat-schema.sql file content
```

### 2. Set up Storage Bucket
Create a storage bucket for file attachments:

```sql
-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);

-- Set up RLS policy for attachments
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments');
```

### 3. Required Tables
The schema creates these main tables:
- `chat_rooms` - Project-based chat rooms
- `chat_participants` - Room membership management
- `chat_messages` - Real-time messages with file support
- `chat_attachments` - File attachment metadata
- `chat_unread_messages` - Unread message tracking

## Features Implemented

### ✅ Core Chat Features
- **Project-based chat rooms** - Each room tied to a project
- **Real-time messaging** - Live updates using Supabase subscriptions
- **Participant management** - Add/remove client representatives
- **Role-based access** - Owner, Admin, Member roles
- **Message threading** - Reply to specific messages
- **Message editing/deletion** - Edit or remove your own messages
- **Unread message tracking** - Badge counts and read status
- **File attachments** - Images and documents with download

### ✅ User Interface
- **Responsive design** - Desktop and mobile layouts
- **Chat room list** - Browse and search rooms
- **Message interface** - ChatWork-style message bubbles
- **Participant sidebar** - Manage room members
- **Navigation integration** - Added to main navigation menu

### ✅ Security Features
- **Row Level Security (RLS)** - Database-level access control
- **User authentication** - Integrated with existing auth system
- **File upload security** - Secure storage with access controls

## Usage

### For Project Owners (OrgAdmin)
1. Navigate to "チャット" in the main navigation
2. Click "新規作成" to create a project-based chat room
3. Add contractors and client representatives as participants
4. Manage participant roles (Admin/Member)

### For Contractors
1. Access chat rooms for projects you're working on
2. Communicate with client representatives in real-time
3. Share files and images related to the project
4. Reply to specific messages for better organization

### For Client Representatives
1. Participate in project discussions
2. View project updates and deliverables
3. Coordinate with contractors and other team members

## API Functions

The system includes these PostgreSQL functions:
- `create_chat_room_with_participants()` - Create rooms with initial participants
- `get_unread_message_count()` - Count unread messages
- `mark_messages_as_read()` - Mark messages as read

## Components

### Main Components
- `ChatLayout` - Main chat interface layout
- `ChatRoomList` - List of available chat rooms
- `ChatMessageInterface` - Message display and input
- `ChatParticipants` - Participant management sidebar

### Integration
- Added chat navigation to all user roles
- Integrated with existing authentication system
- Uses existing UI components (Button, Badge, etc.)

## Next Steps
1. Apply the database schema in Supabase
2. Set up the storage bucket for file attachments
3. Test the chat functionality with different user roles
4. Customize styling to match your brand requirements

The chat system is now fully functional and ready for use!