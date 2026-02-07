import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Layout } from './components/Layout';
import { Scanner } from './components/Scanner';
import { ChatAssistant } from './components/ChatAssistant';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { INITIAL_EVENTS, CHANNELS, INITIAL_MESSAGES, DAILY_TIMETABLE, WEEKLY_TIMETABLE, INITIAL_OD_REQUESTS } from './constants';
import { Event, User, UserRole, ODRequest, Channel, Message, Registration, Period } from './types';
import { generateSmartEventDescription, analyzeODRequest } from './services/geminiService';
import { Plus, Search, Send, Hash, MoreVertical, Users, Heart, MessageCircle, Share2, Bookmark, CheckCircle, Bell, X, Award, AlertCircle, BookOpen, Clock, XCircle, ExternalLink, FileText, Upload, Calendar, Edit, Eye, UserCheck, SmilePlus, MessageSquare, ChevronRight, CornerDownRight, Volume2, Mic, Headphones, Brain, Sparkles, QrCode, Keyboard, ChevronLeft, CalendarDays, List, Moon, Sun, MapPin } from 'lucide-react';

const AppContent = () => {
  const { user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [odRequests, setOdRequests] = useState<ODRequest[]>(INITIAL_OD_REQUESTS);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scheduleView, setScheduleView] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UI State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isExternalRegModalOpen, setIsExternalRegModalOpen] = useState(false);
  const [isVerifyEntryModalOpen, setIsVerifyEntryModalOpen] = useState(false);

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
  const [newEventLocation, setNewEventLocation] = useState('');
  
  // Time Selection State (12h format)
  const [newTimeHour, setNewTimeHour] = useState('10');
  const [newTimeMinute, setNewTimeMinute] = useState('00');
  const [newTimeAmPm, setNewTimeAmPm] = useState('AM');

  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Reset thread when channel changes
  useEffect(() => {
    setActiveThread(null);
  }, [activeChannel]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- FORUM LOGIC ---
  const handleSendMessage = (text: string, parentId: string | null = null) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser?.id || 'unknown',
      senderName: currentUser?.name || 'Unknown',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: currentUser?.role || UserRole.STUDENT,
      reactions: {},
      replies: []
    };

    setChatMessages(prev => {
      const channelMsgs = [...(prev[activeChannel.id] || [])];
      
      if (parentId) {
        const parentIndex = channelMsgs.findIndex(m => m.id === parentId);
        if (parentIndex !== -1) {
           const parent = { ...channelMsgs[parentIndex] };
           parent.replies = [...parent.replies, newMessage];
           channelMsgs[parentIndex] = parent;
           
           if (activeThread?.id === parentId) {
             setActiveThread(parent);
           }
        }
      } else {
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

        if (targetMsgIndex === -1) return prev;

        const updateReactions = (currentReactions: Record<string, string[]>) => {
            const newReactions = { ...currentReactions };
            const users = newReactions[emoji] ? [...newReactions[emoji]] : [];
            
            if (users.includes(currentUser?.id || '')) {
                newReactions[emoji] = users.filter(id => id !== (currentUser?.id || ''));
                if (newReactions[emoji].length === 0) delete newReactions[emoji];
            } else {
                newReactions[emoji] = [...users, currentUser?.id || ''];
            }
            return newReactions;
        };

        if (parentId && parentIndex !== -1) {
            const parent = { ...channelMsgs[parentIndex] };
            const reply = { ...parent.replies[targetMsgIndex] };
            reply.reactions = updateReactions(reply.reactions);
            parent.replies[targetMsgIndex] = reply;
            channelMsgs[parentIndex] = parent;
            if (activeThread?.id === parentId) setActiveThread(parent);
        } else {
            const msg = { ...channelMsgs[targetMsgIndex] };
            msg.reactions = updateReactions(msg.reactions);
            channelMsgs[targetMsgIndex] = msg;
            if (activeThread?.id === msgId) setActiveThread(msg);
        }

        return { ...prev, [activeChannel.id]: channelMsgs };
    });
  };

  // --- EVENT CREATION LOGIC ---
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    ampm: 'AM',
    location: '',
    category: 'TECHNICAL',
    type: 'INTERNAL'
  });

  const handleCreateEvent = () => {
    // Validate required fields
    if (!newEvent.title.trim()) {
      setNotification('Please enter event title');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!newEvent.description.trim()) {
      setNotification('Please enter event description');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!newEvent.date) {
      setNotification('Please select event date');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!newEvent.time) {
      setNotification('Please select event time');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (!newEvent.location.trim()) {
      setNotification('Please enter event location');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Create new event object
    const createdEvent: Event = {
      id: `event_${Date.now()}`,
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      date: newEvent.date,
      endDate: newEvent.date, // Same day for now
      time: `${newEvent.time}:${newEvent.ampm}`,
      endTime: '', // Can be added later
      location: newEvent.location.trim(),
      category: newEvent.category as Event['category'],
      type: newEvent.type as Event['type'],
      registrationLink: '#', // Can be added later
      image: `https://picsum.photos/seed/${newEvent.title.replace(/\s+/g, '')}/800/600`,
      organizer: currentUser.name,
      likes: 0,
      isStudentPost: false
    };

    // Add to events list
    setEvents(prev => [createdEvent, ...prev]);
    
    // Reset form and close modal
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      ampm: 'AM',
      location: '',
      category: 'TECHNICAL',
      type: 'INTERNAL'
    });
    
    setIsEventModalOpen(false);
    setNotification('Event created successfully!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setNewEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleODApproval = (odId: string, status: 'approved' | 'rejected') => {
    // Update OD request status
    setOdRequests(prev => 
      prev.map(od => 
        od.id === odId 
          ? { 
              ...od, 
              status, 
              approvedDate: status === 'approved' ? new Date().toISOString() : undefined,
              faculty: currentUser.name 
            }
          : od
      )
    );
    
    // Show notification
    setNotification(`OD request ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInternalRegister = (event: Event) => {
    window.open(event.registrationLink, '_blank');
    
    const newReg: Registration = {
      id: `reg_${Date.now()}`,
      eventId: event.id,
      studentId: currentUser?.id || 'unknown',
      timestamp: new Date().toISOString()
    };
    setRegistrations(prev => [...prev, newReg]);

    showNotification(`Registered for ${event.title}. Go to 'My Registrations' to apply for OD.`);
  };

  const openExternalModal = (event: Event) => {
    setSelectedEventForExternal(event);
    setExtEventDate(event.date);
    setExtCollegeName('');
    setExtProofFile(null);
    setIsExternalRegModalOpen(true);
  };

  const submitExternalRegistration = () => {
    if (!selectedEventForExternal) return;
    
    const newReg: Registration = {
        id: `reg_${Date.now()}`,
        eventId: selectedEventForExternal.id,
        studentId: currentUser?.id || 'unknown',
        collegeName: extCollegeName,
        proofUrl: 'mock_proof.pdf',
        timestamp: new Date().toISOString()
    };
    setRegistrations(prev => [...prev, newReg]);
    
    window.open(selectedEventForExternal.registrationLink, '_blank');
    
    setIsExternalRegModalOpen(false);
    showNotification(`Registered for ${selectedEventForExternal.title}. Go to 'My Registrations' to apply for OD.`);
  };

  const handleGenerateDescription = async () => {
    if (!newEvent.title) return;
    setIsGeneratingDesc(true);
    const desc = await generateSmartEventDescription(newEvent.title, newEvent.category);
    setGeneratedDescription(desc);
    setIsGeneratingDesc(false);
  };

  // --- OD 3-STEP LOGIC ---
  const handleApplyOD = (event: Event) => {
    const odId = `od_${Date.now()}`;
    const newOD: ODRequest = {
      id: odId,
      studentId: currentUser?.id || 'unknown',
      studentName: currentUser?.name || 'Unknown',
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
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleApproveOD = (reqId: string) => {
    setOdRequests(prev => prev.map(od => {
      if (od.id === reqId) {
        const uniqueCode = generateUniqueCode();
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
    const stats = request.studentId === currentUser?.id 
        ? currentUser.stats 
        : { attendancePercentage: Math.floor(Math.random() * 40) + 50 };
    
    if (!stats) return;

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
                    users.includes(currentUser?.id || '') 
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

  const renderEventsFeed = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Upcoming Events</h2>
        
        {/* Add Event Button for Teachers and Club Admins */}
        {(currentUser.role === 'TEACHER' || currentUser.role === 'CLUB_ADMIN') && (
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>Create Event</span>
          </button>
        )}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Internal Events */}
        <div>
          <h3 className={`text-xl font-semibold mb-4 flex items-center ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            Internal Events
          </h3>
          <div className="space-y-4">
            {events.filter(event => event.type === 'internal').map(event => (
              <div key={event.id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Calendar size={32} className="text-white" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {event.title}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Internal
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {event.date}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {event.category}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleInternalRegister(event)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Register
                    </button>
                    <button 
                      onClick={() => handleLikeEvent(event.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        likedEvents.has(event.id) 
                          ? 'bg-red-100 text-red-600' 
                          : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Heart size={14} fill={likedEvents.has(event.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* External Events */}
        <div>
          <h3 className={`text-xl font-semibold mb-4 flex items-center ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            External Events
          </h3>
          <div className="space-y-4">
            {events.filter(event => event.type === 'external').map(event => (
              <div key={event.id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="h-32 bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <ExternalLink size={32} className="text-white" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {event.title}
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      External
                    </span>
                  </div>
                  <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {event.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {event.date}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {event.category}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openExternalModal(event)}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Apply for OD
                    </button>
                    <button 
                      onClick={() => handleLikeEvent(event.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        likedEvents.has(event.id) 
                          ? 'bg-red-100 text-red-600' 
                          : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Heart size={14} fill={likedEvents.has(event.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  const renderCompletedEvents = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Completed Events</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.filter(event => event.status === 'completed' || new Date(event.date) < new Date()).map(event => (
          <div key={event.id} className="bg-white rounded-xl shadow-lg overflow-hidden opacity-75">
            <div className="h-48 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center relative">
              <img src={event.image} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
              <div className="relative z-10 text-center">
                <CheckCircle size={48} className="text-white mx-auto mb-2" />
                <span className="text-white font-semibold">Completed</span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
              <p className="text-gray-600 mb-4">{event.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{event.date}</span>
                <span>{event.location}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Heart size={16} className="text-red-500" fill="currentColor" />
                  <span className="text-sm">{event.likes || 0}</span>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Attended
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSchedule = () => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Event Schedule</h2>
        <div className="flex items-center space-x-4">
          {/* Date Picker for Daily View */}
          {scheduleView === 'daily' && (
            <input
              type="date"
              value={currentDate.toISOString().split('T')[0]}
              onChange={(e) => setCurrentDate(new Date(e.target.value))}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          )}
          
          {/* View Mode Toggle */}
          <div className={`flex rounded-lg p-1 ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setScheduleView('daily')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scheduleView === 'daily'
                  ? isDarkMode 
                    ? 'bg-gray-700 text-indigo-400 shadow-sm'
                    : 'bg-white text-indigo-600 shadow-sm'
                  : isDarkMode
                    ? 'text-gray-300 hover:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setScheduleView('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                scheduleView === 'weekly'
                  ? isDarkMode 
                    ? 'bg-gray-700 text-indigo-400 shadow-sm'
                    : 'bg-white text-indigo-600 shadow-sm'
                  : isDarkMode
                    ? 'text-gray-300 hover:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {scheduleView === 'daily' ? (
        /* Daily View */
        <div className={`rounded-xl shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`p-4 border-b ${
            isDarkMode 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}>
            <h3 className="text-lg font-semibold text-white">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-blue-100 text-sm">Daily Schedule</p>
          </div>
          
          {/* Daily Timeline */}
          <div className={`divide-y ${
            isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            {[
              { time: '8:00 AM - 9:00 AM', subject: 'Data Structures', type: 'Theory', location: 'Room 101', icon: BookOpen },
              { time: '9:00 AM - 10:00 AM', subject: 'Database Systems', type: 'Theory', location: 'Room 102', icon: BookOpen },
              { time: '10:00 AM - 11:00 AM', subject: 'Tech Workshop', type: 'Lab', location: 'Lab Complex B', icon: BookOpen },
              { time: '11:00 AM - 12:00 PM', subject: 'Web Development', type: 'Theory', location: 'Room 103', icon: BookOpen },
              { time: '12:00 PM - 1:00 PM', subject: 'Lunch Break', type: 'Break', location: 'Cafeteria', icon: Clock },
              { time: '1:00 PM - 2:00 PM', subject: 'Machine Learning', type: 'Theory', location: 'Room 104', icon: BookOpen },
              { time: '2:00 PM - 3:00 PM', subject: 'Computer Networks', type: 'Theory', location: 'Room 105', icon: BookOpen },
              { time: '3:00 PM - 4:00 PM', subject: 'Lab Session', type: 'Lab', location: 'Lab Complex A', icon: BookOpen },
              { time: '4:00 PM - 5:00 PM', subject: 'Project Work', type: 'Lab', location: 'Innovation Lab', icon: BookOpen },
            ].map((item, index) => (
              <div key={index} className={`p-4 transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <item.icon size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      <h4 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {item.subject}
                      </h4>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.type}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      <span className={`flex items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        <Clock size={12} className="mr-1" />
                        {item.time}
                      </span>
                      <span className={`flex items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        <MapPin size={12} className="mr-1" />
                        {item.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.type === 'Theory' ? (isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800') :
                      item.type === 'Lab' ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') :
                      (isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800')
                    }`}>
                      {item.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Weekly View */
        <div className={`rounded-xl shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`p-4 border-b ${
            isDarkMode 
              ? 'bg-gradient-to-r from-purple-600 to-pink-700' 
              : 'bg-gradient-to-r from-purple-500 to-pink-600'
          }`}>
            <h3 className="text-lg font-semibold text-white">Weekly Schedule</h3>
            <p className="text-purple-100 text-sm">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-8 gap-0 text-sm">
              {/* Empty corner for time labels */}
              <div className="p-2"></div>
              
              {/* Day headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className={`p-2 text-center font-semibold border-b border-r ${
                  isDarkMode 
                    ? 'text-gray-300 border-gray-700' 
                    : 'text-gray-700 border-gray-200'
                }`}>
                  {day}
                  <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date(Date.now() + (index - new Date().getDay() + 1) * 24 * 60 * 60 * 1000).getDate()}
                  </div>
                </div>
              ))}
              
              {/* Time slots */}
              {[
                '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
                '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
              ].map((time, timeIndex) => (
                <React.Fragment key={time}>
                  {/* Time label */}
                  <div className={`p-2 text-xs border-b border-r text-right pr-2 ${
                    isDarkMode 
                      ? 'text-gray-500 border-gray-700' 
                      : 'text-gray-500 border-gray-200'
                  }`}>
                    {time}
                  </div>
                  
                  {/* Day columns */}
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                    const hasEvent = timeIndex === 2 && dayIndex === 1; // Tuesday 10:00 AM
                    const hasClass = timeIndex >= 0 && timeIndex <= 4 && dayIndex <= 4; // Weekday classes
                    
                    return (
                      <div 
                        key={`${timeIndex}-${dayIndex}`} 
                        className={`p-2 border-b border-r min-h-[60px] ${
                          hasEvent ? (isDarkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-100 border-blue-300') : 
                          hasClass ? (isDarkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200') : 
                          (isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200')
                        }`}
                      >
                        {hasEvent && (
                          <div className="text-xs p-1 bg-blue-600 text-white rounded">
                            <div className="font-semibold">Tech Workshop</div>
                            <div className="text-xs opacity-90">Lab Complex B</div>
                          </div>
                        )}
                        {hasClass && !hasEvent && (
                          <div className="text-xs p-1 bg-green-600 text-white rounded">
                            <div className="font-semibold">Theory Class</div>
                            <div className="text-xs opacity-90">Room {101 + timeIndex}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  const renderRegistrations = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Registrations</h2>
      <div className="grid gap-4">
        {registrations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No registrations yet</p>
            <p className="text-sm">Register for events to see them here</p>
          </div>
        ) : (
          registrations.map(reg => {
            const event = events.find(e => e.id === reg.eventId);
            return event ? (
              <div key={reg.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <p className="text-gray-600">{event.description}</p>
                    <p className="text-sm text-gray-500 mt-2">Registered on: {new Date(reg.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Registered
                  </span>
                </div>
              </div>
            ) : null;
          })
        )}
      </div>
    </div>
  );

  const renderAttendance = () => {
  if (currentUser.role === 'TEACHER') {
    // Teacher View - OD Approvals
    return (
      <div className="p-6">
        <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>OD Approvals</h2>
        
        <div className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Pending OD Requests
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm ${
                isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {odRequests.filter(od => od.status === 'pending').length} Pending
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {odRequests.filter(od => od.status === 'pending').map(od => (
              <div key={od.id} className={`border rounded-lg p-4 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className={`font-semibold text-lg ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {od.eventName}
                    </h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      {od.date}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student:</span>
                        <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{od.studentName || 'Student Name'}</span>
                      </div>
                      <div>
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Registration:</span>
                        <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{od.studentRegNumber || 'Reg Number'}</span>
                      </div>
                      <div>
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department:</span>
                        <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{od.department || 'CSE'}</span>
                      </div>
                      <div>
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Applied:</span>
                        <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {new Date(od.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Pending
                  </span>
                </div>
                
                {/* Proof Document */}
                <div className={`mb-4 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h5 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Supporting Document
                  </h5>
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {od.proofDocument || 'event_proof.pdf'}
                    </span>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Document
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleODApproval(od.id, 'approved')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Approve OD
                  </button>
                  <button 
                    onClick={() => handleODApproval(od.id, 'rejected')}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Reject OD
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {odRequests.filter(od => od.status === 'pending').length === 0 && (
            <div className="text-center py-8">
              <CheckCircle size={48} className={`mx-auto mb-4 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-300'
              }`} />
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No pending OD requests
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                All student OD requests have been processed
              </p>
            </div>
          )}
        </div>
        
        {/* Recent Approved/Rejected */}
        <div className={`mt-6 rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Recent Decisions
          </h3>
          <div className="space-y-3">
            {odRequests.filter(od => od.status !== 'pending').slice(0, 5).map(od => (
              <div key={od.id} className={`flex items-center justify-between p-3 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div>
                  <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {od.eventName}
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {od.studentName || 'Student'} • {od.date}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  od.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {od.status.charAt(0).toUpperCase() + od.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else {
    // Student View - Personal Attendance & OD
    return (
      <div className="p-6">
        <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Attendance & OD</h2>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attendance Overview */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Attendance Overview</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32">
                      <circle
                        className={isDarkMode ? 'text-gray-700' : 'text-gray-200'}
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="56"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className="text-green-500"
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 56 * 0.85} ${2 * Math.PI * 56}`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="56"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute">
                      <span className={`text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>85%</span>
                    </div>
                  </div>
                  <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overall Attendance</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Classes Attended</span>
                    <span className="text-2xl font-bold text-blue-600">42</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Classes Missed</span>
                    <span className="text-2xl font-bold text-red-600">8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Classes</span>
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Standing</span>
                    <span className="text-2xl font-bold text-green-600">Silver</span>
                  </div>
                </div>
              </div>
              
              {/* Subject-wise Attendance */}
              <div className="mt-6">
                <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Subject-wise Attendance</h4>
                <div className="space-y-3">
                  {['Data Structures', 'Database Systems', 'Web Development', 'Machine Learning', 'Computer Networks'].map((subject, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{subject}</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-32 rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${Math.floor(Math.random() * 20) + 80}%`}}
                          ></div>
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'} w-12 text-right`}>
                          {Math.floor(Math.random() * 20) + 80}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div>
            <div className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Quick Stats</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-600 font-medium">CGPA</span>
                    <Award className="text-blue-600" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">8.5</p>
                  <p className="text-sm text-blue-600">Very Good</p>
                </div>
                
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900' : 'bg-purple-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={isDarkMode ? 'text-purple-400 font-medium' : 'text-purple-600 font-medium'}>Arrears</span>
                    <AlertCircle className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} size={20} />
                  </div>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>0</p>
                  <p className={`text-sm ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Clear</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* OD Requests Section */}
        <div className="mt-8">
          <div className={`rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>My OD Requests</h3>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                Apply for OD
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {odRequests.map(od => (
                <div key={od.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{od.eventName}</h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{od.date}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      od.status === 'approved' ? 'bg-green-100 text-green-800' :
                      od.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      od.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {od.status.charAt(0).toUpperCase() + od.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Applied on:</span>
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                        {new Date(od.appliedDate).toLocaleDateString()}
                      </span>
                    </div>
                    {od.approvedDate && (
                      <div className="flex justify-between">
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Approved on:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>
                          {new Date(od.approvedDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {od.faculty && (
                      <div className="flex justify-between">
                        <span className={`text-gray-600 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Faculty:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-900'}>{od.faculty}</span>
                      </div>
                    )}
                  </div>
                  
                  {od.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {odRequests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No OD requests yet</p>
                <p className="text-sm">Apply for OD when you attend external events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

  const renderClubDashboard = () => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Club Dashboard</h2>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="text-blue-600" size={24} />
            <span className="text-2xl font-bold">156</span>
          </div>
          <h3 className="font-semibold">Total Members</h3>
          <p className="text-sm text-gray-600">Active club members</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="text-green-600" size={24} />
            <span className="text-2xl font-bold">12</span>
          </div>
          <h3 className="font-semibold">Events Organized</h3>
          <p className="text-sm text-gray-600">This semester</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Award className="text-purple-600" size={24} />
            <span className="text-2xl font-bold">4.8</span>
          </div>
          <h3 className="font-semibold">Average Rating</h3>
          <p className="text-sm text-gray-600">Event feedback</p>
        </div>
      </div>
      
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm">New member registration: John Doe</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm">Event "Tech Workshop" completed successfully</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <p className="text-sm">Budget approved for cultural fest</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForum = () => null; // Removed community forum

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        switchUser={() => {}} // Placeholder - remove switch user functionality
        onProfileClick={() => setIsProfileModalOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={logout}
    >
      {notification && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-[60] flex items-center animate-in slide-in-from-top-5 fade-in">
           <Bell size={18} className="mr-2 text-yellow-400" />
           {notification}
        </div>
      )}

      {activeTab === 'events' && renderEventsFeed()}
      {activeTab === 'completed-events' && renderCompletedEvents()}
      {activeTab === 'schedule' && renderSchedule()}
      {activeTab === 'registrations' && renderRegistrations()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'club-dashboard' && renderClubDashboard()}
      
      {/* Event Creation Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl mx-4 rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Create New Event
                </h3>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter event title"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Describe the event"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Event Type
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="INTERNAL">Internal Event</option>
                    <option value="EXTERNAL">External Event</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Hour
                    </label>
                    <select
                      value={newEvent.time.split(':')[0] || '12'}
                      onChange={(e) => handleInputChange('time', `${e.target.value}:${newEvent.time.split(':')[1] || '00'}`)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Minute
                    </label>
                    <select
                      value={newEvent.time.split(':')[1]?.split(':')[0] || '00'}
                      onChange={(e) => handleInputChange('time', `${newEvent.time.split(':')[0] || '12'}:${e.target.value}`)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="00">00</option>
                      <option value="01">01</option>
                      <option value="02">02</option>
                      <option value="03">03</option>
                      <option value="04">04</option>
                      <option value="05">05</option>
                      <option value="06">06</option>
                      <option value="07">07</option>
                      <option value="08">08</option>
                      <option value="09">09</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="13">13</option>
                      <option value="14">14</option>
                      <option value="15">15</option>
                      <option value="16">16</option>
                      <option value="17">17</option>
                      <option value="18">18</option>
                      <option value="19">19</option>
                      <option value="20">20</option>
                      <option value="21">21</option>
                      <option value="22">22</option>
                      <option value="23">23</option>
                      <option value="24">24</option>
                      <option value="25">25</option>
                      <option value="26">26</option>
                      <option value="27">27</option>
                      <option value="28">28</option>
                      <option value="29">29</option>
                      <option value="30">30</option>
                      <option value="31">31</option>
                      <option value="32">32</option>
                      <option value="33">33</option>
                      <option value="34">34</option>
                      <option value="35">35</option>
                      <option value="36">36</option>
                      <option value="37">37</option>
                      <option value="38">38</option>
                      <option value="39">39</option>
                      <option value="40">40</option>
                      <option value="41">41</option>
                      <option value="42">42</option>
                      <option value="43">43</option>
                      <option value="44">44</option>
                      <option value="45">45</option>
                      <option value="46">46</option>
                      <option value="47">47</option>
                      <option value="48">48</option>
                      <option value="49">49</option>
                      <option value="50">50</option>
                      <option value="51">51</option>
                      <option value="52">52</option>
                      <option value="53">53</option>
                      <option value="54">54</option>
                      <option value="55">55</option>
                      <option value="56">56</option>
                      <option value="57">57</option>
                      <option value="58">58</option>
                      <option value="59">59</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      AM/PM
                    </label>
                    <select
                      value={newEvent.ampm}
                      onChange={(e) => handleInputChange('ampm', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Event location"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Category
                    </label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="TECHNICAL">Technical</option>
                      <option value="CULTURAL">Cultural</option>
                      <option value="SPORTS">Sports</option>
                      <option value="CLUB">Club</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-6 border-t flex justify-end space-x-3 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
