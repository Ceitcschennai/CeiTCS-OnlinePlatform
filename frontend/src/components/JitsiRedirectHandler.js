import { useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const JitsiRedirectHandler = () => {
  useEffect(() => {
    // Notify backend when page/tab closes (student leaves app completely)
    const handleBeforeUnload = () => {
      const classId = localStorage.getItem('currentLiveClassId');
      const studentId = localStorage.getItem('currentStudentId');
      
      if (classId && studentId) {
        // Use sendBeacon for reliable notification
        const data = JSON.stringify({ classId, studentId });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`${API_BASE_URL}/api/live-classes/leave`, blob);
        
        console.log('📤 Sent leave notification via sendBeacon');
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
};

export default JitsiRedirectHandler;
