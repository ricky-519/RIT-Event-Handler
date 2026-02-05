import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Layout } from './components/Layout';
import { Scanner } from './components/Scanner';
import { ChatAssistant } from './components/ChatAssistant';
import { MOCK_USER, MOCK_TEACHER, MOCK_CLUB_ADMIN, INITIAL_EVENTS, CHANNELS, INITIAL_MESSAGES, DAILY_TIMETABLE, WEEKLY_TIMETABLE, INITIAL_OD_REQUESTS } from './constants';
import { Event, User, UserRole, ODRequest, Channel, Message, Registration, Period } from './types';
import { generateSmartEventDescription, analyzeODRequest } from './services/geminiService';
import { Plus, Search, Send, Hash, MoreVertical, Users, Heart, MessageCircle, Share2, Bookmark, CheckCircle, Bell, X, Award, AlertCircle, BookOpen, Clock, XCircle, ExternalLink, FileText, Upload, Calendar, Edit, Eye, UserCheck, SmilePlus, MessageSquare, ChevronRight, CornerDownRight, Volume2, Mic, Headphones, Brain, Sparkles, QrCode, Keyboard, ChevronLeft, CalendarDays, List, Moon, Sun } from 'lucide-react';

const App = () => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [odRequests, setOdRequests] = useState<ODRequest[]>(INITIAL_OD_REQUESTS);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // UI State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isExternalRegModalOpen, setIsExternalRegModalOpen] = useState(false);
  const [isVerifyEntryModalOpen, setIsVerifyEntryModalOpen] = useState(false);
  
  // Schedule View State
  const [scheduleView, setScheduleView] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Selection State
  const [selectedEventForExternal, setSelectedEventForExternal] = useState<Event | null>(null);
  const [scannedODRequest, setScannedODRequest] = useState<ODRequest | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // External Form State
  const [extCollegeName, setExtCollegeName] = useState('');
  const [extEventDate, setExtEventDate] = useState('');
  const [extProofFile, setExtProofFile] = useState<string | null>(null);

  // Forum State
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0]);
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [messageInput, setMessageInput] = useState('');
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [threadInput, setThreadInput] = useState('');

  // Event Creation State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<Event['category']>('CLUB');
  const [newEventType, setNewEventType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  
  // Time Selection State (12h format)
  const [newTimeHour, setNewTimeHour] = useState('10');
  const [newTimeMinute, setNewTimeMinute] = useState('00');
  const [newTimeAmPm, setNewTimeAmPm] = useState('AM');

  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Reset thread when channel changes
  useEffect(() => {
    setActiveThread(null);
  }, [activeChannel]);

  const switchUser = () => {
    // Cycle: STUDENT -> TEACHER -> CLUB_ADMIN -> STUDENT
    if (currentUser.role === UserRole.STUDENT) {
        setCurrentUser(MOCK_TEACHER);
        setActiveTab('attendance'); // Teachers usually check attendance
    } else if (currentUser.role === UserRole.TEACHER) {
        setCurrentUser(MOCK_CLUB_ADMIN);
        setActiveTab('club-dashboard');
    } else {
        setCurrentUser(MOCK_USER);
        setActiveTab('events');
    }

    setIsProfileModalOpen(false);
    setIsEventModalOpen(false);
    setIsExternalRegModalOpen(false);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- FORUM LOGIC ---

  const handleSendMessage = (text: string, parentId: string | null = null) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: currentUser.role,
      reactions: {},
      replies: []
    };

    setChatMessages(prev => {
      const channelMsgs = [...(prev[activeChannel.id] || [])];
      
      if (parentId) {
        // Add as reply
        const parentIndex = channelMsgs.findIndex(m => m.id === parentId);
        if (parentIndex !== -1) {
           const parent = { ...channelMsgs[parentIndex] };
           parent.replies = [...parent.replies, newMessage];
           channelMsgs[parentIndex] = parent;
           
           // Update active thread view if open
           if (activeThread?.id === parentId) {
             setActiveThread(parent);
           }
        }
      } else {
        // Add as main message
        channelMsgs.push(newMessage);
      }
      return { ...prev, [activeChannel.id]: channelMsgs };
    });

    if (parentId) setThreadInput('');
    else setMessageInput('');
  };

  const handleReaction = (msgId: string, emoji: string, parentId: string | null = null) => {
    setChatMessages(prev => {
        const channelMsgs = [...(prev[activeChannel.id] || [])];
        let targetMsgIndex = -1;
        let parentIndex = -1;

        if (parentId) {
            parentIndex = channelMsgs.findIndex(m => m.id === parentId);
            if (parentIndex !== -1) {
                targetMsgIndex = channelMsgs[parentIndex].replies.findIndex(r => r.id === msgId);
            }
        } else {
            targetMsgIndex = channelMsgs.findIndex(m => m.id === msgId);
        }

        if (targetMsgIndex === -1) return prev; // Not found

        // Helper to update reaction map
        const updateReactions = (currentReactions: Record<string, string[]>) => {
            const newReactions = { ...currentReactions };
            const users = newReactions[emoji] ? [...newReactions[emoji]] : [];
            
            if (users.includes(currentUser.id)) {
                // Remove reaction
                newReactions[emoji] = users.filter(id => id !== currentUser.id);
                if (newReactions[emoji].length === 0) delete newReactions[emoji];
            } else {
                // Add reaction
                newReactions[emoji] = [...users, currentUser.id];
            }
            return newReactions;
        };

        if (parentId && parentIndex !== -1) {
            // Update Reply
            const parent = { ...channelMsgs[parentIndex] };
            const reply = { ...parent.replies[targetMsgIndex] };
            reply.reactions = updateReactions(reply.reactions);
            parent.replies[targetMsgIndex] = reply;
            channelMsgs[parentIndex] = parent;
            if (activeThread?.id === parentId) setActiveThread(parent);
        } else {
            // Update Main Message
            const msg = { ...channelMsgs[targetMsgIndex] };
            msg.reactions = updateReactions(msg.reactions);
            channelMsgs[targetMsgIndex] = msg;
            if (activeThread?.id === msgId) setActiveThread(msg);
        }

        return { ...prev, [activeChannel.id]: channelMsgs };
    });
  };

  // --- REGISTRATION LOGIC ---

  const handleInternalRegister = (event: Event) => {
    // Open Link
    window.open(event.registrationLink, '_blank');
    
    // 1. Create Registration Only
    const newReg: Registration = {
      id: `reg_${Date.now()}`,
      eventId: event.id,
      studentId: currentUser.id,
      timestamp: new Date().toISOString()
    };
    setRegistrations(prev => [...prev, newReg]);

    showNotification(`Registered for ${event.title}. Go to 'My Registrations' to apply for OD.`);
  };

  const openExternalModal = (event: Event) => {
    setSelectedEventForExternal(event);
    setExtEventDate(event.date); // Default to event date
    setExtCollegeName('');
    setExtProofFile(null);
    setIsExternalRegModalOpen(true);
  };

  const submitExternalRegistration = () => {
    if (!selectedEventForExternal) return;
    
    // 1. Create Registration Only
    const newReg: Registration = {
        id: `reg_${Date.now()}`,
        eventId: selectedEventForExternal.id,
        studentId: currentUser.id,
        collegeName: extCollegeName,
        proofUrl: 'mock_proof.pdf',
        timestamp: new Date().toISOString()
    };
    setRegistrations(prev => [...prev, newReg]);
    
    // Simulate opening the external form after data collection
    window.open(selectedEventForExternal.registrationLink, '_blank');
    
    setIsExternalRegModalOpen(false);
    showNotification(`Registered for ${selectedEventForExternal.title}. Go to 'My Registrations' to apply for OD.`);
  };

  const handleGenerateDescription = async () => {
    if (!newEventTitle) return;
    setIsGeneratingDesc(true);
    const desc = await generateSmartEventDescription(newEventTitle, newEventCategory);
    setGeneratedDescription(desc);
    setIsGeneratingDesc(false);
  };

  const handleCreateEvent = () => {
    const formattedTime = `${newTimeHour}:${newTimeMinute} ${newTimeAmPm}`;

    const newEvent: Event = {
      id: `e_${Date.now()}`,
      title: newEventTitle,
      category: newEventCategory,
      description: generatedDescription,
      date: newEventDate || new Date().toISOString().split('T')[0], 
      time: formattedTime,
      location: 'TBA',
      type: newEventType,
      registrationLink: 'https://forms.gle/mock',
      organizer: currentUser.name, // Will capture Club Name or Teacher Name
      image: `https://picsum.photos/seed/${Date.now()}/800/600`,
      likes: 0,
      isStudentPost: false
    };
    setEvents(prev => [newEvent, ...prev]);
    setIsEventModalOpen(false);
    setNewEventTitle('');
    setGeneratedDescription('');
    setNewEventDate('');
    setNewEventType('INTERNAL');
    // Reset time defaults
    setNewTimeHour('10');
    setNewTimeMinute('00');
    setNewTimeAmPm('AM');
    showNotification("Event Created Successfully!");
  };

  // --- OD 3-STEP LOGIC ---

  const handleApplyOD = (event: Event) => {
    const odId = `od_${Date.now()}`;
    const newOD: ODRequest = {
      id: odId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      eventId: event.id,
      eventTitle: event.title,
      eventTime: event.time,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    setOdRequests(prev => [newOD, ...prev]);
    showNotification(`Step 3 Complete: OD Application for "${event.title}" sent to Teacher.`);
  };

  const generateUniqueCode = () => {
    // Simple 6 digit random number
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleApproveOD = (reqId: string) => {
    setOdRequests(prev => prev.map(od => {
      if (od.id === reqId) {
        const uniqueCode = generateUniqueCode();
        // Generate QR Code data with unique code
        const qrData = JSON.stringify({ 
            odId: od.id, 
            sid: od.studentId, 
            eid: od.eventId,
            code: uniqueCode 
        });
        
        return { 
            ...od, 
            status: 'TEACHER_APPROVED',
            qrCodeData: qrData,
            uniqueCode: uniqueCode 
        };
      }
      return od;
    }));
    showNotification("Step 4 Complete: OD Request Approved. QR & Unique Code generated.");
  };

  const handleDenyOD = (reqId: string) => {
    setOdRequests(prev => prev.map(od => 
      od.id === reqId ? { ...od, status: 'REJECTED' } : od
    ));
    showNotification("OD Request has been denied.");
  };

  const handleAnalyzeOD = async (request: ODRequest) => {
    // Mock getting student stats. In a real app, we'd fetch from DB.
    // For 'u1' (Alex), use MOCK_USER. For others, random for simulation.
    const stats = request.studentId === 'u1' 
        ? MOCK_USER.stats 
        : { attendancePercentage: Math.floor(Math.random() * 40) + 50 }; // Random between 50-90%
    
    if (!stats) return;

    // Show loading state
    setOdRequests(prev => prev.map(od => 
        od.id === request.id ? { ...od, aiAnalysis: 'Analyzing attendance records...' } : od
    ));

    const analysis = await analyzeODRequest(request.studentName, stats.attendancePercentage, request.eventTitle);

    setOdRequests(prev => prev.map(od => 
        od.id === request.id ? { ...od, aiAnalysis: analysis } : od
    ));
  };

  const handleScan = (data: string) => {
    if (data === "SIMULATED_VALID_OD_QR_CODE") {
        const anyApproved = odRequests.find(od => od.status === 'TEACHER_APPROVED');
        if (anyApproved) {
            setScannedODRequest(anyApproved);
            setIsVerifyEntryModalOpen(true);
            showNotification("Verified");
        } else {
             showNotification("Error in scanning not a qr code");
        }
        return;
    }

    try {
        const parsed = JSON.parse(data);
        let foundOD = odRequests.find(od => od.id === parsed.odId);

        if (!foundOD && parsed.eid) {
            const event = events.find(e => e.id === parsed.eid);
            if (event) {
                foundOD = {
                    id: parsed.odId || `od_scanned_${Date.now()}`,
                    studentId: parsed.sid || 'unknown',
                    studentName: 'External/Scanned Student',
                    eventId: event.id,
                    eventTitle: event.title,
                    eventTime: event.time,
                    status: 'TEACHER_APPROVED',
                    timestamp: new Date().toISOString(),
                    qrCodeData: data
                };
            }
        }

        if (foundOD) {
            if (foundOD.status === 'EVENT_ATTENDED') {
                showNotification(`Student ${foundOD.studentName} already marked present!`);
                return;
            }
            if (foundOD.status !== 'TEACHER_APPROVED') {
                showNotification("Invalid Pass: OD not approved by Teacher yet.");
                return;
            }
            setScannedODRequest(foundOD);
            setIsVerifyEntryModalOpen(true);
            showNotification("Verified");
        } else {
            showNotification("Error in scanning not a qr code");
        }
    } catch (e) {
        console.error("Scan Error", e);
        showNotification("Error in scanning not a qr code");
    }
  };

  const handleManualVerify = () => {
    if (!manualCodeInput || manualCodeInput.length < 6) {
        showNotification("Please enter a valid 6-digit code.");
        return;
    }
    
    const foundOD = odRequests.find(od => od.uniqueCode === manualCodeInput);
    
    if (foundOD) {
         if (foundOD.status === 'EVENT_ATTENDED') {
            showNotification(`Student ${foundOD.studentName} already marked present!`);
            setManualCodeInput('');
            return;
        }
        if (foundOD.status !== 'TEACHER_APPROVED') {
             showNotification("Invalid Code: OD not approved.");
             return;
        }
        setScannedODRequest(foundOD);
        setIsVerifyEntryModalOpen(true);
        setManualCodeInput('');
    } else {
        showNotification("Invalid Code: No matching OD found.");
    }
  };

  const confirmStudentEntry = () => {
      if (scannedODRequest) {
          setOdRequests(prev => {
             const exists = prev.find(od => od.id === scannedODRequest.id);
             if (exists) {
                 return prev.map(od => 
                    od.id === scannedODRequest.id ? { ...od, status: 'EVENT_ATTENDED' } : od
                 );
             } else {
                 return [{ ...scannedODRequest, status: 'EVENT_ATTENDED' }, ...prev];
             }
          });
          
          setIsVerifyEntryModalOpen(false);
          setScannedODRequest(null);
          showNotification("Step 5 Complete: Entry Verified. Teacher notified.");
      }
  };

  const handleLikeEvent = (eventId: string) => {
    setLikedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) newSet.delete(eventId);
      else newSet.add(eventId);
      return newSet;
    });
  };

  // --- RENDER HELPERS ---

  const renderReactionButton = (msg: Message, parentId: string | null = null) => (
      <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button 
                key={emoji}
                onClick={() => handleReaction(msg.id, emoji, parentId)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                    users.includes(currentUser.id) 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                        : 'bg-gray-100 text-gray-600 border-transparent hover:border-gray-300'
                }`}
              >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
              </button>
          ))}
          
          <div className="relative group opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex items-center justify-center w-6 h-6 rounded bg-gray-50 text-gray-400 hover:bg-gray-200 transition-colors">
                  <SmilePlus size={14} />
              </button>
              {/* Simple Reaction Picker Hover */}
              <div className="absolute top-0 left-full ml-1 bg-white shadow-xl rounded-lg p-1.5 flex space-x-1 hidden group-hover:flex animate-in fade-in zoom-in duration-200 border border-gray-100 z-10">
                  {['👍','❤️','🔥','😂','😮','😢'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => handleReaction(msg.id, emoji, parentId)}
                        className="hover:bg-gray-100 p-1 rounded text-base transition-transform hover:scale-110"
                      >
                          {emoji}
                      </button>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderForum = () => {
    const categories = ['GENERAL', 'CLUBS', 'ACADEMIC', 'FACULTY'];
    const currentMessages = chatMessages[activeChannel.id] || [];

    return (
        <div className="flex h-[calc(100vh-100px)] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 font-sans">
            {/* Discord-style Sidebar */}
            <div className="w-64 bg-[#f2f3f5] flex flex-col hidden md:flex border-r border-gray-200">
                <div className="h-12 border-b border-gray-200 flex items-center px-4 font-bold text-gray-700 shadow-sm bg-white z-10">
                    SmartCampus Forums
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                    {categories.map(cat => (
                        <div key={cat}>
                            <div className="flex items-center justify-between px-2 mb-1 group cursor-pointer text-gray-500 hover:text-gray-700">
                                <h3 className="text-[10px] font-bold uppercase tracking-wide">{cat}</h3>
                                <Plus size={12} className="opacity-0 group-hover:opacity-100" />
                            </div>
                            <div className="space-y-0.5">
                                {CHANNELS.filter(c => c.category === cat && (c.type !== 'TEACHER_ONLY' || currentUser.role === UserRole.TEACHER)).map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => setActiveChannel(channel)}
                                        className={`w-full text-left px-2 py-1.5 rounded-[4px] text-sm font-medium flex items-center group transition-all ${
                                            activeChannel.id === channel.id 
                                            ? 'bg-gray-200 text-gray-900' 
                                            : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                                        }`}
                                    >
                                        <Hash size={18} className="mr-1.5 text-gray-400" />
                                        <span className="truncate">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {/* User Control Panel */}
                <div className="h-14 bg-[#ebedef] flex items-center px-2 border-t border-gray-200">
                    <div className="relative">
                        <img src={currentUser.avatar} className="w-8 h-8 rounded-full bg-gray-300" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#ebedef] rounded-full"></div>
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{currentUser.name}</div>
                        <div className="text-[10px] text-gray-500">#{currentUser.id.substring(0,4)}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button className="p-1 hover:bg-gray-300 rounded"><Mic size={14} /></button>
                        <button className="p-1 hover:bg-gray-300 rounded"><Headphones size={14} /></button>
                        <button className="p-1 hover:bg-gray-300 rounded"><SettingsIcon size={14} /></button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col min-w-0 bg-white ${activeThread ? 'mr-[300px] hidden lg:flex' : ''}`}>
                {/* Header */}
                <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 shadow-sm shrink-0">
                    <div className="flex items-center">
                        <Hash size={24} className="text-gray-400 mr-2" />
                        <h2 className="font-bold text-gray-800">{activeChannel.name}</h2>
                        {activeChannel.category === 'CLUBS' && <span className="ml-3 text-xs text-gray-400 hidden sm:inline-block">Welcome to the official {activeChannel.name} channel!</span>}
                    </div>
                    <div className="flex items-center space-x-4 text-gray-500">
                        <Bell size={20} className="hover:text-gray-700 cursor-pointer" />
                        <Users size={20} className="hover:text-gray-700 cursor-pointer" />
                        <div className="relative">
                            <input className="bg-gray-100 text-xs rounded px-2 py-1 w-32 transition-all focus:w-48 outline-none text-gray-700" placeholder="Search" />
                            <Search size={14} className="absolute right-2 top-1.5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                    {currentMessages.length === 0 ? (
                        <div className="mt-auto mb-6 px-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <Hash size={32} className="text-gray-500" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to #{activeChannel.name}!</h1>
                            <p className="text-gray-500">This is the start of the #{activeChannel.name} channel.</p>
                        </div>
                    ) : (
                        currentMessages.map((msg, index) => {
                             const prevMsg = currentMessages[index - 1];
                             // Simple grouping check: same user, less than 5 mins apart
                             const isGrouped = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.timestamp === msg.timestamp; 
                             
                             return (
                                <div key={msg.id} className={`group flex items-start pl-4 pr-4 py-0.5 hover:bg-gray-50/50 -mx-4 ${!isGrouped ? 'mt-3' : ''}`}>
                                    {!isGrouped ? (
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 mt-0.5 shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                            <img src={`https://ui-avatars.com/api/?name=${msg.senderName}&background=random`} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 text-[10px] text-gray-400 text-right pr-3 opacity-0 group-hover:opacity-100 self-center">
                                            {msg.timestamp.split(' ')[0]}
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0 ml-3">
                                        {!isGrouped && (
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900 hover:underline cursor-pointer">{msg.senderName}</span>
                                                {msg.role === UserRole.TEACHER && (
                                                    <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded font-bold uppercase h-4 flex items-center">BOT</span>
                                                )}
                                                <span className="text-xs text-gray-400">{msg.timestamp}</span>
                                            </div>
                                        )}
                                        <p className={`text-gray-800 text-[15px] leading-snug ${isGrouped ? '' : 'mt-0.5'}`}>{msg.content}</p>
                                        
                                        {/* Reactions & Thread Link */}
                                        <div className="flex items-center flex-wrap gap-2">
                                            {renderReactionButton(msg)}
                                        </div>
                                        
                                        {msg.replies.length > 0 && (
                                            <div 
                                                onClick={() => setActiveThread(msg)}
                                                className="mt-1 flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded max-w-fit"
                                            >
                                                <div className="h-0.5 w-6 bg-gray-300 rounded-full"></div>
                                                <div className="flex -space-x-1">
                                                    {msg.replies.slice(0,2).map(r => (
                                                        <img key={r.id} src={`https://ui-avatars.com/api/?name=${r.senderName}`} className="w-4 h-4 rounded-full border border-white" />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-blue-500 font-medium hover:underline">{msg.replies.length} replies</span>
                                                <span className="text-[10px] text-gray-400 hidden group-hover:inline-block">View thread ›</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover Actions (Desktop) */}
                                    <div className="bg-white border border-gray-200 rounded shadow-sm p-1 absolute right-8 -top-2 hidden group-hover:flex items-center space-x-1 z-10">
                                        <button onClick={() => handleReaction(msg.id, '👍')} className="p-1 hover:bg-gray-100 rounded text-gray-500"><SmilePlus size={16} /></button>
                                        <button onClick={() => setActiveThread(msg)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><MessageSquare size={16} /></button>
                                        <button className="p-1 hover:bg-gray-100 rounded text-gray-500"><CornerDownRight size={16} /></button>
                                    </div>
                                </div>
                             )
                        })
                    )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white">
                    <div className="bg-[#ebedef] rounded-lg px-4 py-2.5 flex items-center space-x-3">
                        <button className="text-gray-500 hover:text-gray-700 bg-gray-300 rounded-full p-0.5"><Plus size={16} /></button>
                        <input 
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(messageInput)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 placeholder-gray-500 text-gray-800"
                            placeholder={`Message #${activeChannel.name}`}
                        />
                        <div className="flex space-x-3 text-gray-500">
                             <Ticket size={20} className="cursor-pointer hover:text-gray-700" />
                             <SmilePlus size={20} className="cursor-pointer hover:text-gray-700" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Thread Sidebar (Right) */}
            {activeThread && (
                <div className="w-[300px] border-l border-gray-200 bg-[#f2f3f5] flex flex-col absolute right-0 top-0 bottom-0 md:static z-20 shadow-xl md:shadow-none">
                    <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-[#f2f3f5] shrink-0">
                        <div className="flex items-center font-bold text-gray-700">
                            Thread
                        </div>
                        <button onClick={() => setActiveThread(null)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Thread Parent */}
                        <div className="flex items-start space-x-3 opacity-80">
                             <div className="w-8 h-8 rounded-full bg-gray-400 shrink-0">
                                <img src={`https://ui-avatars.com/api/?name=${activeThread.senderName}`} className="w-full h-full rounded-full" />
                             </div>
                             <div>
                                 <div className="flex items-baseline space-x-2">
                                     <span className="font-bold text-sm text-gray-800">{activeThread.senderName}</span>
                                     <span className="text-xs text-gray-500">{activeThread.timestamp}</span>
                                 </div>
                                 <p className="text-sm text-gray-700 mt-1">{activeThread.content}</p>
                             </div>
                        </div>

                        <div className="relative flex items-center py-2">
                             <div className="grow border-t border-gray-300"></div>
                             <span className="shrink-0 mx-2 text-xs text-gray-500 font-bold">{activeThread.replies.length} REPLIES</span>
                             <div className="grow border-t border-gray-300"></div>
                        </div>

                        {/* Replies */}
                        {activeThread.replies.map(reply => (
                            <div key={reply.id} className="flex items-start space-x-3 group">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0">
                                   <img src={`https://ui-avatars.com/api/?name=${reply.senderName}`} className="w-full h-full rounded-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline space-x-2">
                                        <span className="font-bold text-sm text-gray-900">{reply.senderName}</span>
                                        <span className="text-xs text-gray-500">{reply.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 mt-0.5">{reply.content}</p>
                                    {renderReactionButton(reply, activeThread.id)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-[#f2f3f5]">
                         <div className="bg-[#ebedef] rounded-lg px-3 py-2">
                            <input 
                                value={threadInput}
                                onChange={(e) => setThreadInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(threadInput, activeThread.id)}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 placeholder-gray-500"
                                placeholder={`Reply to @${activeThread.senderName}`}
                            />
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderEventCard = (event: Event) => {
      const isRegistered = registrations.some(r => r.eventId === event.id);
      const isLiked = likedEvents.has(event.id);
      
      return (
        <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 p-0.5">
                   <img src={`https://ui-avatars.com/api/?name=${event.organizer}&background=random`} className="w-full h-full rounded-full object-cover" alt="avatar" />
                </div>
                <div>
                   <p className="text-sm font-semibold text-gray-900">{event.organizer}</p>
                   <p className="text-xs text-gray-500">{event.location}</p>
                </div>
              </div>
            </div>

            <div className="relative aspect-video bg-gray-100">
               <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
               <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                 {event.category}
               </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-center mb-3">
                <div className="flex space-x-3">
                  <button onClick={() => handleLikeEvent(event.id)}>
                    <Heart size={22} className={isLiked ? "fill-red-500 text-red-500" : "text-gray-600"} />
                  </button>
                  <Share2 size={22} className="text-gray-600" />
                </div>
                <span className="text-xs text-gray-400">{event.date} • {event.time}</span>
              </div>

              <h3 className="font-bold text-gray-900 mb-1 leading-tight">{event.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{event.description}</p>

              {currentUser.role === UserRole.STUDENT && (
                  <button
                    onClick={() => event.type === 'INTERNAL' ? handleInternalRegister(event) : openExternalModal(event)}
                    disabled={isRegistered}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center ${
                      isRegistered 
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                    }`}
                  >
                    {isRegistered ? (
                        <><CheckCircle size={16} className="mr-2"/> Registered</>
                    ) : (
                        <><ExternalLink size={16} className="mr-2"/> Register Now</>
                    )}
                  </button>
              )}
            </div>
        </div>
      );
  };

  const renderTimetable = () => {

    // Helper to get periods for a specific day
    const getPeriodsForDay = (dayName: string, dateObj?: Date) => {
         const basePeriods = WEEKLY_TIMETABLE[dayName] || [];
         
         return basePeriods.map(period => {
             let overrideSubject = null;
             let statusStyle = "";
             let statusLabel = "";

             if (dateObj) {
                 // Construct YYYY-MM-DD
                 // Note: We need to handle timezone offsets if we use getISOString, 
                 // but simple extraction is safer for local time assumed in UI
                 const year = dateObj.getFullYear();
                 const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                 const day = String(dateObj.getDate()).padStart(2, '0');
                 const dateStr = `${year}-${month}-${day}`;

                 // Find matching OD request
                 const od = odRequests.find(od => {
                     if (od.studentId !== currentUser.id) return false;
                     const event = events.find(e => e.id === od.eventId);
                     if (!event) return false;
                     return event.date === dateStr && event.time === period.startTime;
                 });

                 if (od) {
                     if (od.status === 'TEACHER_APPROVED') {
                         overrideSubject = od.eventTitle;
                         statusLabel = "Teacher Approved";
                         statusStyle = "bg-yellow-50 border-yellow-200";
                     } else if (od.status === 'EVENT_ATTENDED') {
                         overrideSubject = od.eventTitle;
                         statusLabel = "OD (ON DUTY)";
                         statusStyle = "bg-green-50 border-green-200";
                     } else if (od.status === 'PENDING') {
                         overrideSubject = od.eventTitle;
                         statusLabel = "OD Pending";
                         statusStyle = "bg-gray-50 border-gray-200 opacity-70";
                     }
                 }
             }

             return { 
                 ...period, 
                 displaySubject: overrideSubject || period.subject,
                 statusLabel,
                 statusStyle
             };
         });
    };

    const renderDailySchedule = () => {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Remove weekend fallback to ensure Sunday shows no classes
        const periods = getPeriodsForDay(dayName, currentDate);

        return (
            <div className="space-y-4">
               {/* Date Picker Header */}
               <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in">
                   <div className="flex items-center space-x-4">
                       <h2 className="text-lg font-bold text-gray-800">
                           {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                       </h2>
                   </div>
                   <input 
                       type="date"
                       // Handle timezone offset for input value
                       value={currentDate.toLocaleDateString('en-CA')} // YYYY-MM-DD
                       onChange={(e) => setCurrentDate(e.target.valueAsDate || new Date())}
                       className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
               </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
                    {periods.length > 0 ? periods.map((period) => (
                        <div 
                            key={period.id} 
                            className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                                period.statusLabel 
                                    ? `${period.statusStyle} shadow-md transform scale-105` 
                                    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:shadow-md'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                 <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                                     period.statusLabel ? 'bg-white/50 text-gray-800' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    {period.startTime}
                                </div>
                                {period.statusLabel && (
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        period.statusLabel.includes('ON DUTY') ? 'bg-green-600 text-white' : 
                                        period.statusLabel.includes('Approved') ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'
                                    }`}>
                                         {period.statusLabel}
                                    </span>
                                )}
                            </div>
                            
                            <div className="mt-4">
                                <h3 className={`font-bold text-lg ${period.statusLabel ? 'text-gray-900' : 'text-gray-800'}`}>
                                    {period.displaySubject}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">{period.endTime}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                             <CalendarDays size={48} className="mb-4 text-gray-300" />
                             <p className="font-medium">No classes scheduled for {dayName}.</p>
                             <p className="text-xs">Enjoy your free time!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderWeeklySchedule = () => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        return (
            <div className="space-y-6 animate-in fade-in">
                {days.map(day => {
                    const periods = getPeriodsForDay(day); // No date passed, shows standard timetable
                    return (
                        <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 flex justify-between items-center">
                                <span>{day}</span>
                                <span className="text-xs text-gray-400 font-normal">{periods.length} Periods</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {periods.map(p => (
                                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{p.startTime}</div>
                                            <div className="font-medium text-sm text-gray-800">
                                                {p.subject}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif italic">
                        {currentUser.role === UserRole.TEACHER ? "Teaching Schedule" : "Class Schedule"}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {currentUser.role === UserRole.TEACHER ? "Manage your lectures and upcoming classes." : "Manage your daily classes and OD status."}
                    </p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
                    <button 
                        onClick={() => { setScheduleView('daily'); setCurrentDate(new Date()); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${scheduleView === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <List size={16} />
                        <span>Daily</span>
                    </button>
                    <button 
                        onClick={() => setScheduleView('weekly')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${scheduleView === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <CalendarDays size={16} />
                        <span>Weekly</span>
                    </button>
                </div>
            </div>

            {scheduleView === 'daily' && renderDailySchedule()}
            {scheduleView === 'weekly' && renderWeeklySchedule()}
        </div>
    );
  };

  const renderEventsFeed = () => {
      // Filter out past events
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today

      const upcomingEvents = events.filter(e => {
          // Parse YYYY-MM-DD manually to ensure local time comparison
          if (!e.date) return false;
          const [year, month, day] = e.date.split('-').map(Number);
          const eventDate = new Date(year, month - 1, day); // Month is 0-indexed
          return eventDate >= today;
      });

      const internalEvents = upcomingEvents.filter(e => e.type === 'INTERNAL');
      const externalEvents = upcomingEvents.filter(e => e.type === 'EXTERNAL');

      return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 px-2">
                <h1 className="text-2xl font-bold text-gray-900 font-serif italic">Events Feed</h1>
                {(currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLUB_ADMIN) && (
                    <button 
                        onClick={() => setIsEventModalOpen(true)}
                        className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition"
                        title="Create Event"
                    >
                        <Plus size={24} />
                    </button>
                )}
            </div>

            {upcomingEvents.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No upcoming events found.</p>
                    <p className="text-sm text-gray-400">Check back later or create a new event!</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {internalEvents.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-700">Internal Events</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-4">
                            {internalEvents.map(renderEventCard)}
                        </div>
                    </div>
                )}

                {externalEvents.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-200">
                            <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-700">External Events</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-4">
                            {externalEvents.map(renderEventCard)}
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  };

  const renderMyRegistrations = () => {
    const myRegs = registrations.filter(r => r.studentId === currentUser.id);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>
            {myRegs.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">You haven't registered for any events yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {myRegs.map(reg => {
                        const event = events.find(e => e.id === reg.eventId);
                        if (!event) return null;
                        const odRequest = odRequests.find(od => od.eventId === event.id && od.studentId === currentUser.id);
                        
                        return (
                            <div key={reg.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start space-x-4">
                                    <img src={event.image} className="w-20 h-20 rounded-lg object-cover bg-gray-200" alt="event" />
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                                        <p className="text-sm text-gray-500 mb-1">{event.date} • {event.time}</p>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${event.type === 'INTERNAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {event.type}
                                            </span>
                                            {reg.collegeName && <span className="text-xs text-gray-400">@ {reg.collegeName}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end space-y-2 min-w-[180px]">
                                    {!odRequest ? (
                                        <button 
                                            onClick={() => handleApplyOD(event)}
                                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Apply for OD
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-1 ${
                                                odRequest.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                odRequest.status === 'TEACHER_APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                                                odRequest.status === 'EVENT_ATTENDED' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {odRequest.status === 'PENDING' && 'Pending Teacher'}
                                                {odRequest.status === 'TEACHER_APPROVED' && 'Ready to Scan'}
                                                {odRequest.status === 'EVENT_ATTENDED' && 'Attended (OD Used)'}
                                                {odRequest.status === 'REJECTED' && 'OD Rejected'}
                                            </span>
                                            <p className="text-[10px] text-gray-400">Step {odRequest.status === 'PENDING' ? '1/3' : odRequest.status === 'TEACHER_APPROVED' ? '2/3' : '3/3'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
  };

  const renderClubDashboard = () => (
      <div className="space-y-8">
          <div className="relative h-48 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-900 overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute bottom-6 left-6 flex items-end">
                  <div className="w-24 h-24 bg-white rounded-xl p-1 shadow-lg">
                      <img src={currentUser.avatar} alt="Club Logo" className="w-full h-full rounded-lg object-cover" />
                  </div>
                  <div className="ml-4 text-white mb-1">
                      <h1 className="text-3xl font-bold">{currentUser.name}</h1>
                      <p className="opacity-90">Manage events, track attendance, and more.</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">Step 3: Event Entry Scanner</h2>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <Scanner onScan={handleScan} mockData={odRequests.find(od => od.status === 'TEACHER_APPROVED')?.qrCodeData} />
                      <div className="mt-4 text-center">
                          <p className="text-sm font-medium text-gray-900">Ready to verify ODs</p>
                          <p className="text-xs text-gray-500">Scan student QR codes at the venue entrance.</p>
                      </div>

                      {/* Manual Entry Section */}
                      <div className="mt-6 pt-6 border-t border-gray-100">
                         <div className="flex items-center justify-center space-x-2 text-gray-500 mb-3">
                             <Keyboard size={16} />
                             <span className="text-xs font-bold uppercase tracking-wide">Manual Verification</span>
                         </div>
                         <div className="flex space-x-2">
                             <input 
                                type="text"
                                maxLength={6}
                                value={manualCodeInput}
                                onChange={(e) => setManualCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="Enter 6-digit Code"
                                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 text-indigo-700 font-bold"
                             />
                             <button 
                                onClick={handleManualVerify}
                                disabled={manualCodeInput.length !== 6}
                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm"
                             >
                                Verify
                             </button>
                         </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900">Your Events</h2>
                      <button 
                          onClick={() => setIsEventModalOpen(true)}
                          className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center"
                      >
                          <Plus size={16} className="mr-1" /> Create New
                      </button>
                  </div>
                  <div className="space-y-4">
                      {events.filter(e => e.organizer === currentUser.name || e.type === 'INTERNAL').slice(0, 3).map(event => (
                          <div key={event.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                      <img src={event.image} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-gray-900">{event.title}</h3>
                                      <p className="text-xs text-gray-500">{event.date}</p>
                                  </div>
                              </div>
                              <div className="flex space-x-2">
                                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                      <Edit size={16} />
                                  </button>
                                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                      <Users size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderAttendance = () => {
    if (currentUser.role === UserRole.TEACHER) {
      // Teacher View: List of OD requests
      const pendingODs = odRequests.filter(od => od.status === 'PENDING');
      const processedODs = odRequests.filter(od => od.status !== 'PENDING');

      return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Pending Approvals</h1>
                {pendingODs.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
                        No pending OD requests.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingODs.map(od => (
                            <div key={od.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{od.studentName}</h3>
                                        <p className="text-sm text-gray-500">Student ID: {od.studentId}</p>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">Pending</span>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <p className="text-sm text-gray-700"><span className="font-bold">Event:</span> {od.eventTitle}</p>
                                    <p className="text-sm text-gray-700"><span className="font-bold">Time:</span> {od.eventTime}</p>
                                </div>

                                {od.aiAnalysis && (
                                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start space-x-2">
                                        <Sparkles size={18} className="text-indigo-600 mt-0.5" />
                                        <p className="text-sm text-indigo-800 italic">{od.aiAnalysis}</p>
                                    </div>
                                )}

                                <div className="flex space-x-3">
                                    <button 
                                        onClick={() => handleAnalyzeOD(od)}
                                        className="flex-1 py-2 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 flex items-center justify-center"
                                    >
                                        <Brain size={18} className="mr-2" />
                                        Analyze Attendance
                                    </button>
                                    <button 
                                        onClick={() => handleDenyOD(od.id)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 shadow-sm"
                                    >
                                        Deny
                                    </button>
                                    <button 
                                        onClick={() => handleApproveOD(od.id)}
                                        className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm"
                                    >
                                        Approve Request
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div>
                 <h2 className="text-xl font-bold text-gray-800 mb-4">History</h2>
                 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                             {processedODs.map(od => (
                                 <tr key={od.id}>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{od.studentName}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{od.eventTitle}</td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                             od.status === 'TEACHER_APPROVED' ? 'bg-green-100 text-green-800' : 
                                             od.status === 'EVENT_ATTENDED' ? 'bg-blue-100 text-blue-800' :
                                             'bg-red-100 text-red-800'
                                         }`}>
                                             {od.status.replace('_', ' ')}
                                         </span>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        </div>
      );
    } 
    
    // Student View
    const myApprovedODs = odRequests.filter(od => od.studentId === currentUser.id && (od.status === 'TEACHER_APPROVED' || od.status === 'EVENT_ATTENDED'));
    
    return (
        <div className="max-w-md mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 text-center">My OD Pass</h1>
            {myApprovedODs.length > 0 ? (
                myApprovedODs.map(od => (
                    <div key={od.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className={`h-2 ${od.status === 'EVENT_ATTENDED' ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                        <div className="p-6 text-center">
                            <h2 className="text-xl font-bold text-gray-800 mb-1">{od.eventTitle}</h2>
                            <p className="text-gray-500 text-sm mb-6">{od.eventTime}</p>
                            
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-4">
                                {od.qrCodeData ? (
                                    <QRCode value={od.qrCodeData} size={160} />
                                ) : (
                                    <div className="w-40 h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                        QR Error
                                    </div>
                                )}
                            </div>
                            
                            {od.uniqueCode && (
                                <div className="mb-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Backup Code</p>
                                    <p className="text-2xl font-mono font-bold text-gray-800 tracking-wider">{od.uniqueCode}</p>
                                </div>
                            )}

                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                od.status === 'EVENT_ATTENDED' 
                                ? 'bg-gray-100 text-gray-600' 
                                : 'bg-green-100 text-green-700 animate-pulse'
                            }`}>
                                {od.status === 'EVENT_ATTENDED' ? (
                                    <><CheckCircle size={16} className="mr-2" /> Verified & Attended</>
                                ) : (
                                    <><QrCode size={16} className="mr-2" /> Ready to Scan</>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <QrCode size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No active OD passes found.</p>
                    <p className="text-xs text-gray-400 mt-1">Register for events to request OD.</p>
                </div>
            )}
        </div>
    );
  };

  const SettingsIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const Ticket = ({ size, className }: { size: number, className?: string }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M18 12h.01M12 12h.01"/></svg>
  );

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        switchUser={switchUser} 
        onProfileClick={() => setIsProfileModalOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
    >
      {notification && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-[60] flex items-center animate-in slide-in-from-top-5 fade-in">
           <Bell size={18} className="mr-2 text-yellow-400" />
           {notification}
        </div>
      )}

      {activeTab === 'events' && renderEventsFeed()}
      {activeTab === 'schedule' && renderTimetable()}
      {activeTab === 'registrations' && renderMyRegistrations()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'club-dashboard' && renderClubDashboard()}
      {activeTab === 'forum' && renderForum()}
      
      {/* Create Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Post New Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. AI Symposium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <div className="flex space-x-2">
                        <select 
                            value={newTimeHour} 
                            onChange={(e) => setNewTimeHour(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                                <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                            ))}
                        </select>
                        <span className="self-center font-bold text-gray-400">:</span>
                        <select 
                            value={newTimeMinute} 
                            onChange={(e) => setNewTimeMinute(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
                                 <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <select 
                            value={newTimeAmPm} 
                            onChange={(e) => setNewTimeAmPm(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="CLUB">Club Activity</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="CULTURAL">Cultural</option>
                  <option value="SPORTS">Sports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select 
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (AI Assisted)</label>
                <textarea 
                  value={generatedDescription}
                  onChange={(e) => setGeneratedDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Describe the event..."
                />
                <button 
                  onClick={handleGenerateDescription}
                  disabled={!newEventTitle || isGeneratingDesc}
                  className="mt-2 text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center"
                >
                  {isGeneratingDesc ? 'Generating...' : '✨ Auto-generate with AI'}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreateEvent} disabled={!newEventTitle || !generatedDescription || !newEventDate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Post Event</button>
            </div>
          </div>
        </div>
      )}

      {/* External Registration Modal */}
      {isExternalRegModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                <h2 className="text-xl font-bold mb-4">External Event Verification</h2>
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">To register for <span className="font-bold">{selectedEventForExternal?.title}</span>, please provide details for OD processing.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">College/Venue Name</label>
                        <input 
                            value={extCollegeName}
                            onChange={(e) => setExtCollegeName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Anna University"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                        <input 
                            type="date"
                            value={extEventDate}
                            onChange={(e) => setExtEventDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Event (Brochure/Invite)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors cursor-pointer" onClick={() => setExtProofFile('simulated_file.pdf')}>
                            {extProofFile ? (
                                <>
                                    <FileText size={32} className="text-indigo-600 mb-2" />
                                    <span className="text-sm text-gray-900 font-medium">proof_document.pdf</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-sm">Click to upload proof</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsExternalRegModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button 
                        onClick={submitExternalRegistration} 
                        disabled={!extCollegeName || !extProofFile}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Submit & Register
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Organizer Verify Entry Modal */}
      {isVerifyEntryModalOpen && scannedODRequest && (
         <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
             <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <CheckCircle size={32} className="text-green-600" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Entry?</h2>
                 <p className="text-gray-500 text-sm mb-6">Mark student present for the event.</p>
                 
                 <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                     <div className="mb-2">
                         <span className="text-xs text-gray-400 uppercase font-bold">Student</span>
                         <p className="font-semibold text-gray-900">{scannedODRequest.studentName}</p>
                     </div>
                     <div>
                         <span className="text-xs text-gray-400 uppercase font-bold">Event</span>
                         <p className="font-semibold text-gray-900">{scannedODRequest.eventTitle}</p>
                     </div>
                 </div>

                 <div className="flex space-x-3">
                     <button 
                        onClick={() => { setIsVerifyEntryModalOpen(false); setScannedODRequest(null); }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                     >
                         Cancel
                     </button>
                     <button 
                        onClick={confirmStudentEntry}
                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200"
                     >
                         Confirm Entry
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                  <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
                      <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="px-6 relative">
                      <div className="absolute -top-16 left-6 border-4 border-white rounded-full">
                          <img src={currentUser.avatar} alt="Profile" className="w-24 h-24 rounded-full bg-white object-cover" />
                      </div>
                      <div className="pt-12 pb-6">
                          <h2 className="text-2xl font-bold text-gray-900">{currentUser.name}</h2>
                          <p className="text-gray-500">{currentUser.role === UserRole.STUDENT ? 'Student' : currentUser.role === UserRole.TEACHER ? 'Faculty' : 'Club Admin'}</p>
                          
                          {currentUser.role === UserRole.STUDENT && currentUser.stats && (
                              <div className="mt-6 grid grid-cols-2 gap-4">
                                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                      <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                                          <BookOpen size={18} />
                                          <span className="text-xs font-bold uppercase">Attendance</span>
                                      </div>
                                      <p className="text-2xl font-bold text-gray-900">{currentUser.stats.attendancePercentage}%</p>
                                  </div>
                                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                      <div className="flex items-center space-x-2 text-green-600 mb-1">
                                          <Award size={18} />
                                          <span className="text-xs font-bold uppercase">Events Attended</span>
                                      </div>
                                      <p className="text-2xl font-bold text-gray-900">{currentUser.stats.eventsAttended}</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Global AI Assistant */}
      <ChatAssistant events={events} />
    </Layout>
  );
};

export default App;