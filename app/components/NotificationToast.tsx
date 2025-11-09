"use client";

import { useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';

export default function NotificationToast() {
  const { notifications, removeNotification } = useGameStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 select-none">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onClose 
}: { 
  notification: { id: string; type: string; message: string; icon?: string };
  onClose: () => void;
}) {
  const typeStyles = {
    xp_gain: 'bg-yellow-900/90 border-yellow-500 text-yellow-100',
    quest_update: 'bg-blue-900/90 border-blue-500 text-blue-100',
    achievement: 'bg-purple-900/90 border-purple-500 text-purple-100',
    item_acquired: 'bg-green-900/90 border-green-500 text-green-100',
    level_up: 'bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-400 text-white',
  };

  const typeIcons = {
    xp_gain: '⭐',
    quest_update: '📜',
    achievement: '🏆',
    item_acquired: '🎁',
    level_up: '🎊',
  };

  const style = typeStyles[notification.type as keyof typeof typeStyles] || 'bg-gray-900/90 border-gray-500';
  const defaultIcon = typeIcons[notification.type as keyof typeof typeIcons] || '📢';

  return (
    <div 
      className={`
        ${style}
        border-2 rounded-lg p-4 shadow-2xl backdrop-blur-sm
        animate-slide-in-right
        min-w-[280px] max-w-[400px]
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">
          {notification.icon || defaultIcon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight">
            {notification.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
