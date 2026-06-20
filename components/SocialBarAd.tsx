import React, { useEffect } from 'react';

const SocialBarAd: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://pl29473363.effectivecpmnetwork.com/a9/cb/7e/a9cb7e5559f3989c2cb91f81eed6514b.js';
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
};

export default SocialBarAd;
