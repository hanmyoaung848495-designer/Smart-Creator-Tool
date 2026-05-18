import React, { useEffect, useRef } from 'react';

const NativeAd: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous
    containerRef.current.innerHTML = '';
    
    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.innerHTML = `
      atOptions = {
        'key' : 'c1b0e36e4c8984ccd84298606daeea09',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    `;
    
    const script2 = document.createElement('script');
    script2.type = 'text/javascript';
    script2.src = 'https://pl29473362.effectivecpmnetwork.com/c1b0e36e4c8984ccd84298606daeea09/invoke.js';
    
    containerRef.current.appendChild(script1);
    containerRef.current.appendChild(script2);
  }, []);

  return (
    <div className="w-full flex justify-center py-4 overflow-hidden" style={{ minHeight: '100px' }}>
      <div ref={containerRef} id="container-c1b0e36e4c8984ccd84298606daeea09" />
    </div>
  );
};

export default NativeAd;
