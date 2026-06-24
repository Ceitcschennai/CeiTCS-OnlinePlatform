// Generate unique room name for Jitsi
export const generateRoomName = (subject, className, teacherId) => {
  const timestamp = Date.now();
  const sanitizedSubject = subject.replace(/\s+/g, '').toLowerCase();
  return `${sanitizedSubject}-${className}-${teacherId}-${timestamp}`;
};

// Open Jitsi meeting in new tab (for teachers)
export const openJitsiInNewTab = (roomName, displayName, subject, className) => {
  try {
    const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName="${encodeURIComponent(displayName)}"`;
    
    // Store meeting info for reference
    localStorage.setItem(`meeting_${roomName}`, JSON.stringify({
      roomName,
      displayName,
      subject,
      className,
      startTime: new Date().toISOString(),
      role: 'teacher'
    }));
    
    const newWindow = window.open(jitsiUrl, '_blank', 'width=1200,height=800');
    
    if (!newWindow) {
      alert('Please allow popups to start the meeting');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error opening Jitsi meeting:', error);
    return false;
  }
};

// UPDATED: Join Jitsi meeting in NEW WINDOW for students (not same tab)
export const joinJitsiMeeting = (roomName, displayName, classId) => {
  try {
    const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&userInfo.displayName="${encodeURIComponent(displayName)}"`;
    
    // Store meeting info for reference
    localStorage.setItem(`meeting_${roomName}`, JSON.stringify({
      roomName,
      displayName,
      classId,
      startTime: new Date().toISOString(),
      role: 'student'
    }));
    
    // Open in NEW WINDOW instead of same tab
    const meetingWindow = window.open(jitsiUrl, `jitsi_${roomName}`, 'width=1200,height=800');
    
    if (!meetingWindow) {
      alert('Please allow popups to join the meeting');
      return false;
    }
    
    // Monitor when the window is closed
    const checkWindowClosed = setInterval(() => {
      if (meetingWindow.closed) {
        clearInterval(checkWindowClosed);
        console.log('Jitsi meeting window closed');
        
        // Trigger leave event
        const event = new Event('jitsiWindowClosed');
        event.classId = classId;
        window.dispatchEvent(event);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error joining Jitsi meeting:', error);
    return false;
  }
};

// Get meeting info from localStorage
export const getMeetingInfo = (roomName) => {
  try {
    const meetingData = localStorage.getItem(`meeting_${roomName}`);
    return meetingData ? JSON.parse(meetingData) : null;
  } catch (error) {
    console.error('Error getting meeting info:', error);
    return null;
  }
};

// Clean up meeting data
export const cleanupMeetingData = (roomName) => {
  try {
    localStorage.removeItem(`meeting_${roomName}`);
  } catch (error) {
    console.error('Error cleaning up meeting data:', error);
  }
};
