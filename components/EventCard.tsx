import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  onRequestOD: (event: Event) => void;
  isRegistered: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRequestOD, isRegistered }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
      <div className="relative h-48 bg-gray-200">
        <img 
          src={event.image} 
          alt={event.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 shadow-sm">
          {event.category}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar size={16} className="mr-2 text-indigo-500" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <Clock size={16} className="mr-2 text-indigo-500" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <MapPin size={16} className="mr-2 text-indigo-500" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onRequestOD(event)}
          disabled={isRegistered}
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
            isRegistered 
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
          }`}
        >
          {isRegistered ? 'OD Requested' : 'Register & Request OD'}
        </button>
      </div>
    </div>
  );
};