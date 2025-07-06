import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtocolHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle custom protocol (web+booking://)
    const handleProtocol = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingParam = urlParams.get('booking');
      
      if (bookingParam) {
        try {
          // Decode the booking parameter
          const bookingData = decodeURIComponent(bookingParam);
          
          // Parse booking data (could be service ID, direct URL, etc.)
          if (bookingData.startsWith('service:')) {
            const serviceId = bookingData.replace('service:', '');
            // Navigate to booking with specific service
            navigate(`/?service=${serviceId}`);
          } else if (bookingData.startsWith('http')) {
            // Direct booking URL
            window.location.href = bookingData;
          } else {
            // Default to main booking page
            navigate('/');
          }
          
          // Clean up URL
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('booking');
          window.history.replaceState({}, document.title, cleanUrl.toString());
          
        } catch (error) {
          console.log('Protocol handling error:', error);
          navigate('/');
        }
      }
    };

    handleProtocol();

    // Handle shortcut parameters
    const handleShortcuts = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shortcut = urlParams.get('shortcut');
      
      if (shortcut) {
        switch (shortcut) {
          case 'book':
            // Already on booking page, just clean URL
            break;
          case 'about':
            // Already on about page, just clean URL
            break;
          default:
            break;
        }
        
        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('shortcut');
        window.history.replaceState({}, document.title, cleanUrl.toString());
      }
    };

    handleShortcuts();

  }, [navigate]);

  return null; // This component doesn't render anything
};

export default ProtocolHandler;