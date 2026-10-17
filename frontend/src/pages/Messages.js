import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import '../styles/messages.css';
import {
  FaPaperPlane,
  FaSearch,
  FaUser,
  FaEnvelope,
  FaEnvelopeOpen,
  FaClock,
  FaComments,
  FaReply,
  FaTimes,
  FaPaperclip,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileExcel,
  FaFileImage,
  FaFile
} from 'react-icons/fa';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchMessages, setSearchMessages] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const markedReadIds = useRef(new Set());
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId') || JSON.parse(localStorage.getItem('user'))?.id || JSON.parse(localStorage.getItem('user'))?._id;
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/unread-count`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (response.status === 200) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/inbox`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (response.status === 200) {
        setMessages(response.data.messages || []);
        extractConversations(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching inbox:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    fetchUnreadCount();
  }, [fetchInbox, fetchUnreadCount]);

  const extractConversations = (messages) => {
    const conversationMap = {};
    messages.forEach(msg => {
      const otherUserId = msg.senderId === userId 
        ? msg.receiverId 
        : msg.senderId;
      
      // Derive userRole from the model name (stored in senderModel or receiverModel)
      const userRole = msg.senderId === userId 
        ? (msg.receiverModel === 'Teacher' ? 'teacher' : msg.receiverModel === 'Admin' ? 'admin' : 'employee')
        : (msg.senderModel === 'Teacher' ? 'teacher' : msg.senderModel === 'Admin' ? 'admin' : 'employee');
      
      // Use real user name from backend if available, fallback to role label
      const otherUserName = msg.senderId === userId 
        ? (msg.receiverName || `${msg.receiverModel} user`)
        : (msg.senderName || (msg.senderModel === 'Teacher' ? 'Faculty' : msg.senderModel === 'Admin' ? 'Admin' : 'Participant'));
      
      if (!conversationMap[otherUserId]) {
        conversationMap[otherUserId] = {
          userId: otherUserId,
          userRole: userRole,
          userName: otherUserName,
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          unread: msg.isRead ? 0 : 1
        };
      } else {
        if (!msg.isRead) {
          conversationMap[otherUserId].unread++;
        }
      }
    });
    setConversations(Object.values(conversationMap));
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/recipients`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (response.status === 200) {
        setUsers(response.data.recipients || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const openUserSearch = () => {
    setShowUserSearch(true);
    fetchUsers();
  };

  const handleSearchMessages = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (response.status === 200) {
        setSearchResults(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchMessages.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchMessages(searchMessages);
      }, 300);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchMessages, handleSearchMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('receiverId', selectedConversation.userId);
      formData.append('receiverRole', selectedConversation.userRole);
      if (newMessage.trim()) formData.append('message', newMessage);
      if (replyTo?.id) formData.append('replyTo', replyTo.id);
      if (attachment) formData.append('file', attachment.file);

      const response = await axios.post(`${API_BASE_URL}/api/messages/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 201) {
        setNewMessage('');
        setReplyTo(null);
        setAttachment(null);
        fetchInbox();
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response?.status === 429) {
        alert('Rate limit exceeded. Please wait before sending more messages.');
      } else {
        alert('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const openConversation = async (userId, userRole, userName) => {
    setSelectedConversation({ userId, userRole, userName });
    setShowUserSearch(false);
  };

  const handleReply = (msg) => {
    const senderName = msg.senderName || (msg.senderModel === 'Teacher' ? 'Faculty' : msg.senderModel === 'Admin' ? 'Admin' : 'Participant');
    setReplyTo({
      id: msg._id,
      message: msg.message,
      senderName: senderName
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not allowed. Supported: PDF, DOC, DOCX, PPT, PPTX, XLSX, JPG, PNG');
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) {
        alert('File size exceeds 100 MB limit');
        return;
      }
      
      setAttachment({
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      });
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FaFile />;
    if (mimeType.startsWith('image/')) return <FaFileImage />;
    if (mimeType === 'application/pdf') return <FaFilePdf />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FaFileWord />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <FaFilePowerpoint />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FaFileExcel />;
    return <FaFile />;
  };

  const isImageFile = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  const scrollToMessage = (msgId) => {
    const element = messageRefs.current[msgId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const truncateReplyPreview = (text, maxLines = 2) => {
    if (!text) return '';
    const lines = text.split('\n');
    const firstLines = lines.slice(0, maxLines).join('\n');
    return firstLines.length > 60 ? firstLines.substring(0, 60) + '...' : firstLines;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(user => {
    const search = searchUser.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const getUserRoleForUser = (user) => {
    return user?.role || 'employee';
  };

  const getConversationMessages = useCallback(() => {
    if (!selectedConversation) return [];
    return messages.filter(msg => 
      msg.senderId === selectedConversation.userId || 
      msg.receiverId === selectedConversation.userId
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, selectedConversation]);

  const markAsRead = useCallback(async (messageId) => {
    if (markedReadIds.current.has(messageId)) return;
    
    const message = messages.find(m => m._id === messageId);
    if (!message || message.isRead || message.receiverId !== userId) return;

    markedReadIds.current.add(messageId);
    
    setMessages(prev => prev.map(msg => 
      msg._id === messageId 
        ? { ...msg, isRead: true, readAt: new Date().toISOString() } 
        : msg
    ));

    try {
      await axios.put(`${API_BASE_URL}/api/messages/read/${messageId}`, {}, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking message as read:', error);
      markedReadIds.current.delete(messageId);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, isRead: false, readAt: null } 
          : msg
      ));
    }
  }, [messages, userId, fetchUnreadCount]);

  useEffect(() => {
    if (selectedConversation) {
      const unreadMessages = getConversationMessages().filter(msg => 
        msg.receiverId === userId && !msg.isRead
      );
      unreadMessages.forEach(msg => markAsRead(msg._id));
    }
  }, [selectedConversation, getConversationMessages, markAsRead, userId]);

  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="messages-header-content">
          <FaComments className="messages-header-icon" />
          <div>
            <h1 className="messages-title">Messages</h1>
            <p className="messages-subtitle">Secure internal messaging system</p>
          </div>
        </div>
        <div className="messages-unread-badge">
          <FaEnvelope /> {unreadCount} Unread
        </div>
      </div>

      <div className="messages-main">
<div className="messages-sidebar">
           <div className="messages-sidebar-header">
             <h3>Conversations</h3>
             <button 
               className="messages-new-btn"
               onClick={openUserSearch}
               title="Start new conversation"
             >
               <FaPaperPlane />
             </button>
           </div>
           
           <div className="messages-search-container">
             <FaSearch className="messages-search-icon" />
             <input
               type="text"
               placeholder="Search messages..."
               value={searchMessages}
               onChange={(e) => setSearchMessages(e.target.value)}
               className="messages-search-input"
             />
             {searchMessages && (
               <button
                 onClick={() => setSearchMessages('')}
                 className="messages-search-clear"
                 title="Clear search"
               >
                 ×
               </button>
             )}
           </div>
           
           {isSearching && (
             <div className="messages-search-loading">
               <div className="messages-spinner"></div>
               <p>Searching...</p>
             </div>
           )}
           
           {searchMessages.trim().length > 0 && searchResults.length === 0 && !isSearching ? (
             <div className="messages-no-results">
               <p>No messages found</p>
             </div>
           ) : null}

          {loading ? (
            <div className="messages-loading">
              <div className="messages-spinner"></div>
              <p>Loading conversations...</p>
</div>
           ) : conversations.length === 0 ? (
             <div className="messages-empty-sidebar">
               <FaEnvelope className="messages-empty-icon" />
               <p>No conversations yet</p>
               <button onClick={openUserSearch} className="messages-start-btn">
                 Start New Conversation
               </button>
             </div>
           ) : searchMessages.trim().length > 0 ? (
             <div className="messages-search-results">
               {searchResults.map(msg => (
                 <div
                   key={msg._id}
                   className="messages-search-result-item"
                   onClick={() => {
                     const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
                     const otherUserRole = msg.senderId === userId 
                       ? (msg.receiverModel === 'Teacher' ? 'teacher' : msg.receiverModel === 'Admin' ? 'admin' : 'employee')
                       : (msg.senderModel === 'Teacher' ? 'teacher' : msg.senderModel === 'Admin' ? 'admin' : 'employee');
                     const otherUserName = msg.senderId === userId ? msg.receiverName : msg.senderName;
                     setSelectedConversation({ userId: otherUserId, userRole: otherUserRole, userName: otherUserName });
                     setSearchMessages('');
                   }}
                 >
                   <div className="messages-search-result-preview">
                     {msg.message?.substring(0, 60) || msg.attachments?.[0]?.filename || 'Attachment'}
                   </div>
                   <div className="messages-search-result-meta">
                     {formatDate(msg.createdAt)}
                   </div>
                 </div>
               ))}
             </div>
           ) : (
<div className="messages-conversation-list">
                {conversations.map(conv => (
                  <div
                    key={conv.userId}
                    className={`messages-conversation-item ${selectedConversation?.userId === conv.userId ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="messages-conversation-avatar">
                      <FaUser />
                      {conv.unread > 0 && (
                        <span className="messages-conversation-badge">{conv.unread}</span>
                      )}
                    </div>
                    <div className="messages-conversation-info">
                      <div className="messages-conversation-name">{conv.userName}</div>
                      <div className="messages-conversation-preview">
                        {conv.lastMessage?.substring(0, 40)}...
                     </div>
                     <div className="messages-conversation-time">
                       {formatDate(conv.lastMessageTime)}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        <div className="messages-chat-area">
          {showUserSearch && (
            <div className="messages-user-search-overlay">
              <div className="messages-user-search">
                <div className="messages-user-search-header">
                  <h3>Select User to Message</h3>
                  <button 
                    onClick={() => setShowUserSearch(false)}
                    className="messages-close-search"
                  >
                    ×
                  </button>
                </div>
                <div className="messages-user-search-input-container">
                  <FaSearch className="messages-search-icon" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="messages-user-search-input"
                  />
                </div>
<div className="messages-user-list">
                   {filteredUsers.map(user => (
                     <div
                       key={user._id}
                       className="messages-user-item"
onClick={() => openConversation(user._id, getUserRoleForUser(user), user.name)}
                      >
                        <FaUser className="messages-user-icon" />
                        <div>
                          <div className="messages-user-name">
                            {user.name}
                          </div>
                          <div className="messages-user-email">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          )}

          {selectedConversation ? (
            <>
              <div className="messages-chat-header">
                <FaUser className="messages-chat-avatar" />
                <h3>Chat with {selectedConversation.userName || selectedConversation.userRole}</h3>
              </div>

              <div className="messages-chat-messages">
                {getConversationMessages().length === 0 ? (
                  <div className="messages-empty-chat">
                    <FaComments className="messages-empty-chat-icon" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  getConversationMessages().map(msg => {
                    const isOwn = msg.senderId === userId;
                    return (
                      <div
                        key={msg._id}
                        ref={el => messageRefs.current[msg._id] = el}
                        className={`messages-chat-message ${isOwn ? 'sent' : 'received'}`}
                      >
<div className="messages-message-bubble">
                          {msg.replyTo && (
                            <div 
                              className="messages-reply-preview"
                              onClick={() => scrollToMessage(typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo)}
                              title="View original message"
                            >
                              <div className="messages-reply-indicator">↪</div>
                              <div className="messages-reply-content">
                                {typeof msg.replyTo === 'object' && msg.replyTo.message 
                                  ? truncateReplyPreview(msg.replyTo.message) 
                                  : 'Original message'}
                              </div>
                            </div>
                          )}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="messages-attachments">
                              {msg.attachments.map((attach, index) => (
                                <div key={index} className="messages-attachment-card">
                                  {isImageFile(attach.mimeType) && attach.url ? (
                                    <img 
                                      src={attach.url} 
                                      alt={attach.filename}
                                      className="messages-attachment-image"
                                    />
                                  ) : (
                                    <div className="messages-attachment-icon">
                                      {getFileIcon(attach.mimeType)}
                                    </div>
                                  )}
                                  <div className="messages-attachment-info">
                                    <div className="messages-attachment-name" title={attach.filename}>
                                      {attach.filename}
                                    </div>
                                    <a 
                                      href={attach.url} 
                                      download={attach.filename}
                                      className="messages-attachment-download"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      ⬇ Download
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.message && (
                            <div className="messages-message-text">{msg.message}</div>
                          )}
                          <div className="messages-message-timestamp">
                             <FaClock /> {formatTime(msg.createdAt)}
                             {isOwn && (
                               msg.isRead 
                                 ? <><FaEnvelopeOpen style={{ marginLeft: '4px' }} title="Read" />✓✓</>
                                 : <FaEnvelope style={{ marginLeft: '4px' }} title="Delivered" />
                             )}
                             {!isOwn && msg.isRead && (
                               <FaEnvelopeOpen className="messages-read-icon" title="Read" />
                             )}
                             {!isOwn && !msg.isRead && (
                               <FaEnvelope className="messages-unread-icon" title="Unread" />
                             )}
                             <FaReply 
                               className="messages-reply-btn" 
                               onClick={() => handleReply(msg)}
                               title="Reply to this message"
                             />
                           </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="messages-chat-form">
                {replyTo && (
                  <div className="messages-reply-to-bar">
                    <span>Replying to: "{truncateReplyPreview(replyTo.message)}"</span>
                    <FaTimes 
                      className="messages-cancel-reply" 
                      onClick={cancelReply}
                      title="Cancel reply"
                    />
                  </div>
                )}
{attachment && (
                   <div className="messages-attachment-preview">
                     <span>📎 {attachment.name} ({attachment.size} MB)</span>
                     <FaTimes 
                       className="messages-cancel-attachment" 
                       onClick={removeAttachment}
                       title="Remove attachment"
                     />
                   </div>
                 )}
                <div className="messages-input-row">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={replyTo ? "Type your reply..." : "Type your message..."}
                    className="messages-message-input"
                    rows="2"
                    maxLength="1000"
                    disabled={sending}
                  />
<input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.jpg,.jpeg,.png"
                    className="messages-file-input"
                    id="messages-file-input"
                  />
                  <label htmlFor="messages-file-input" className="messages-attach-btn" title="Attach file">
                    <FaPaperclip />
                  </label>
                  <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && !attachment)}
                    className="messages-send-btn"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="messages-no-conversation">
              <FaComments className="messages-no-conversation-icon" />
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar or start a new one</p>
              <button onClick={openUserSearch} className="messages-start-btn">
                Start New Conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;