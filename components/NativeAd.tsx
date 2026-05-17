import React, { useEffect } from 'react';

const NativeAd: React.FC = () => {
  useEffect(() => {
    // Check if script already exists to avoid re-adding
    const existingScript = document.getElementById('native-ad-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'native-ad-script';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl29473362.effectivecpmnetwork.com/c1b0e36e4c8984ccd84298606daeea09/invoke.js';
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 my-6">
      <div 
        id="container-c1b0e36e4c8984ccd84298606daeea09" 
        className="flex justify-center items-center min-h-[50px]"
      ></div>
    </div>
  );
};

export default NativeAd;
