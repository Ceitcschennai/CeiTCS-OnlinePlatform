import React, { useEffect, useRef } from 'react';

const JitsiMeet = ({ meetingId, displayName, onMeetingEnd }) => {
  const jitsiContainer = useRef(null);
  const jitsiApi = useRef(null);

  useEffect(() => {
    if (!meetingId) return;

    // Jitsi Meet configuration
    const options = {
      roomName: meetingId,
      width: '100%',
      height: '100vh',
      parentNode: jitsiContainer.current,
      userInfo: {
        displayName: displayName
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop',
          'fullscreen', 'fodeviceselection', 'hangup', 'profile',
          'chat', 'recording', 'livestreaming', 'etherpad',
          'sharedvideo', 'settings', 'raisehand', 'videoquality',
          'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help'
        ],
      }
    };

    // Create Jitsi Meet instance
    jitsiApi.current = new window.JitsiMeetExternalAPI('meet.jit.si', options);

    // Event listeners
    jitsiApi.current.addEventListener('videoConferenceJoined', () => {
      console.log('Joined the meeting');
    });

    jitsiApi.current.addEventListener('videoConferenceLeft', () => {
      console.log('Left the meeting');
      if (onMeetingEnd) {
        onMeetingEnd();
      }
    });

    jitsiApi.current.addEventListener('readyToClose', () => {
      if (onMeetingEnd) {
        onMeetingEnd();
      }
    });

    // Cleanup function
    return () => {
      if (jitsiApi.current) {
        jitsiApi.current.dispose();
      }
    };
  }, [meetingId, displayName, onMeetingEnd]);

  return (
    <div 
      ref={jitsiContainer}
      style={{ 
        width: '100%', 
        height: '100vh',
        backgroundColor: '#000'
      }}
    />
  );
};

export default JitsiMeet;
