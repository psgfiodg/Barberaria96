import React, { useEffect } from 'react';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

const ShareHandler: React.FC = () => {
  useEffect(() => {
    // Handle Web Share Target API
    const handleShare = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.has('share-target')) {
        const title = urlParams.get('title') || '';
        const text = urlParams.get('text') || '';
        const url = urlParams.get('url') || '';
        
        // Process shared content
        console.log('Shared content received:', { title, text, url });
        
        // You can handle the shared content here
        // For example, pre-fill a booking form or show a notification
        
        // Clean up URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('share-target');
        cleanUrl.searchParams.delete('title');
        cleanUrl.searchParams.delete('text');
        cleanUrl.searchParams.delete('url');
        
        window.history.replaceState({}, document.title, cleanUrl.toString());
      }
    };

    handleShare();

    // Handle native share API
    const handleNativeShare = async (data: ShareData) => {
      if (navigator.share) {
        try {
          await navigator.share(data);
        } catch (error) {
          console.log('Share failed:', error);
        }
      } else {
        // Fallback for browsers without native share
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(data.url || window.location.href);
            // Show success message
          } catch (error) {
            console.log('Copy to clipboard failed:', error);
          }
        }
      }
    };

    // Expose share function globally
    (window as any).shareBarberaria = (data: ShareData) => {
      const shareData = {
        title: data.title || 'Barberaria 96 - Professional Barbering',
        text: data.text || 'Book your appointment at Barberaria 96, Jönköping\'s premier barber shop.',
        url: data.url || window.location.href
      };
      
      handleNativeShare(shareData);
    };

  }, []);

  return null; // This component doesn't render anything
};

export default ShareHandler;