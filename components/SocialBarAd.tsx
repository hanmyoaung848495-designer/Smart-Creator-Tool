import React, { useEffect } from 'react';

const SocialBarAd: React.FC = () => {
  useEffect(() => {
    // Check if script already exists to avoid re-adding
    const scriptId = 'social-bar-ad-script';
    const existingScript = document.getElementById(scriptId);
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.src = 'https://pl29473363.effectivecpmnetwork.com/a9/cb/7e/a9cb7e5559f3989c2cb91f81eed6514b.js';
      document.body.appendChild(script);
    }
  }, []);

  return null; // Social bar ads are usually overlays managed by the script
};

export default SocialBarAd;
