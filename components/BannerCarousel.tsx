import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BANNERS = [
  '/ads_bannar.png',
  '/ads_bannar1.png',
  '/ads_bannar2.png',
  '/ads_bannar3.png',
  '/ads_bannar4.png',
  '/partner_bannar.png'
];

export const BannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % BANNERS.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + BANNERS.length) % BANNERS.length);
  };

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Drag handler for mobile swiping
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
  };

  const renderFallback = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 text-white p-4 md:p-6 text-center select-none relative overflow-hidden font-smartfont3">
            <div className="absolute top-2 left-3 md:top-3 md:left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] md:text-xs font-black tracking-widest uppercase border border-white/25">
              🛍️ KC STORE OFFICIAL
            </div>
            <div className="max-w-4xl px-2 space-y-3 md:space-y-4">
              <h3 className="text-xs sm:text-sm md:text-base font-black tracking-widest text-indigo-200 uppercase">
                ⚙️ Premium Account & Bot Services
              </h3>
              <p className="text-xs sm:text-sm md:text-lg font-medium leading-relaxed sm:leading-loose">
                Telegram ဈေးရောင်း Botများ၊ 
                <span className="mx-1 bg-yellow-400 text-gray-900 font-black px-1.5 py-0.5 rounded shadow-sm text-xs sm:text-sm">Capcut Pro</span>၊ 
                <span className="mx-1 bg-emerald-400 text-gray-900 font-black px-1.5 py-0.5 rounded shadow-sm text-xs sm:text-sm">Canva Pro</span>၊ 
                <span className="mx-1 bg-sky-400 text-gray-900 font-black px-1.5 py-0.5 rounded shadow-sm text-xs sm:text-sm">Gemini Pro</span>၊ 
                Suno AI၊ Zoom၊ ChatGPT၊ Grok၊ VPN များကို 
                <span className="text-yellow-300 font-black underline decoration-yellow-300/60 decoration-2 ml-1">KC Store Official</span> တွင် ယုံကြည်စိတ်ချစွာ ဝယ်ယူရရှိနိုင်ပါပြီ။
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="w-full h-full flex flex-col justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 text-white p-5 md:p-8 select-none relative overflow-hidden font-smartfont3 border-l-4 border-emerald-500">
            <div className="absolute top-2 right-3 md:top-3 md:right-4 bg-emerald-500/20 text-emerald-350 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase border border-emerald-500/30 shadow-inner">
              🔑 LICENSE KEYS
            </div>
            <div className="w-full max-w-4xl mx-auto flex flex-col justify-between h-full pt-6 pb-2.5">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-emerald-350 tracking-wide flex items-center gap-1.5 drop-shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-450 inline-block animate-ping"></span>
                  Essential Software Licenses ယုံကြည်စိတ်ချစွာ ဝယ်ယူရရှိနိုင်ပါပြီ
                </h3>
                <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-white font-bold text-xs sm:text-sm md:text-base">
                  <li className="flex items-center gap-2 bg-emerald-950/50 py-2 px-3.5 rounded-xl border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors shadow-sm">
                    <span className="text-emerald-400 font-extrabold text-sm sm:text-base">✓</span> Windows 10 & 11 (Pro/Home) - 1PC Lifetime
                  </li>
                  <li className="flex items-center gap-2 bg-emerald-950/50 py-2 px-3.5 rounded-xl border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors shadow-sm">
                    <span className="text-emerald-400 font-extrabold text-sm sm:text-base">✓</span> Microsoft Office (2016, 2019, 2021 PP)
                  </li>
                  <li className="flex items-center gap-2 bg-emerald-950/50 py-2 px-3.5 rounded-xl border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors shadow-sm md:col-span-2">
                    <span className="text-emerald-400 font-extrabold text-sm sm:text-base">✓</span> Internet Download Manager (IDM) - 1PC Lifetime
                  </li>
                </ul>
              </div>
              <div className="text-xs sm:text-sm text-slate-350 font-bold border-t border-slate-800/80 pt-2 flex items-center justify-between mt-1">
                <span className="text-slate-200 hover:text-emerald-300 transition-colors">KC Store တွင်ဆက်သွယ်ဝယ်ယူလိုက်ပါ!</span>
                <span className="text-emerald-500 uppercase tracking-widest text-[10px] sm:text-xs font-black">GENUINE KEYS</span>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex flex-col justify-center bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 text-white p-5 md:p-8 select-none relative overflow-hidden font-smartfont3 border-l-4 border-cyan-400">
            <div className="absolute top-2 right-3 md:top-3 md:right-4 bg-cyan-500/20 text-cyan-350 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase border border-cyan-500/30 shadow-inner">
              🛡️ ENDPOINT PROTECTION
            </div>
            <div className="w-full max-w-4xl mx-auto flex flex-col justify-between h-full pt-6 pb-2.5">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-cyan-350 tracking-wide flex items-center gap-1.5 drop-shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
                  Security & MacOS Software
                </h3>
                <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-white font-bold text-xs sm:text-sm md:text-base">
                  <li className="flex items-center gap-2 bg-cyan-950/50 py-2 px-3.5 rounded-xl border border-cyan-800/40 hover:bg-cyan-900/60 transition-colors shadow-sm">
                    <span className="text-cyan-400 font-extrabold text-sm sm:text-base">•</span> Kaspersky Antivirus
                  </li>
                  <li className="flex items-center gap-2 bg-cyan-950/50 py-2 px-3.5 rounded-xl border border-cyan-800/40 hover:bg-cyan-900/60 transition-colors shadow-sm">
                    <span className="text-cyan-400 font-extrabold text-sm sm:text-base">•</span> MS Home and Business (2019, 2021) For MacOS
                  </li>
                </ul>
              </div>
              <div className="text-xs sm:text-sm text-slate-350 font-bold border-t border-slate-800/80 pt-2 flex items-center justify-between mt-1">
                <span className="text-slate-200 hover:text-cyan-300 transition-colors">သင့် Device များ လုံခြုံစိတ်ချရဖို့ KC Store ကို သတိရလိုက်ပါ</span>
                <span className="text-cyan-400 uppercase tracking-widest text-[10px] sm:text-xs font-black">MAC & PC SECURE</span>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex flex-col justify-center bg-gradient-to-tr from-purple-950 via-indigo-950 to-slate-950 text-white p-5 md:p-8 select-none relative overflow-hidden font-smartfont3 border-l-4 border-purple-500">
            <div className="absolute top-2 right-3 md:top-3 md:right-4 bg-purple-500/20 text-purple-350 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase border border-purple-500/30 shadow-inner">
              💼 PROFESSIONAL SUITE
            </div>
            <div className="w-full max-w-4xl mx-auto flex flex-col justify-between h-full pt-5 pb-2">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-purple-350 tracking-wide drop-shadow-md">
                  Professional & Server Solutions
                </h3>
                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-white font-bold text-xs sm:text-sm md:text-base">
                  <li className="flex items-center gap-1.5 py-1.5 px-2.5 bg-purple-900/35 rounded-xl border border-purple-800/30 hover:bg-purple-900/60 transition-colors shadow-sm">
                    <span className="text-purple-450 font-extrabold text-sm sm:text-base">▪</span> Autodesk (AutoCAD & Revit 2024-2027 Edu)
                  </li>
                  <li className="flex items-center gap-1.5 py-1.5 px-2.5 bg-purple-900/35 rounded-xl border border-purple-800/30 hover:bg-purple-900/60 transition-colors shadow-sm">
                    <span className="text-purple-450 font-extrabold text-sm sm:text-base">▪</span> Microsoft Project & Visio (2016, 2019, 2021)
                  </li>
                  <li className="flex items-center gap-1.5 py-1.5 px-2.5 bg-purple-900/35 rounded-xl border border-purple-800/30 hover:bg-purple-900/60 transition-colors shadow-sm">
                    <span className="text-purple-450 font-extrabold text-sm sm:text-base">▪</span> Windows Server (2012 R2 - 2022 Standard & DC)
                  </li>
                  <li className="flex items-center gap-1.5 py-1.5 px-2.5 bg-purple-900/35 rounded-xl border border-purple-800/30 hover:bg-purple-900/60 transition-colors shadow-sm">
                    <span className="text-purple-450 font-extrabold text-sm sm:text-base">▪</span> SQL Server (2010 - 2019 Standard)
                  </li>
                </ul>
              </div>
              <div className="text-xs sm:text-sm text-slate-350 font-bold border-t border-purple-950/50 pt-2 flex items-center justify-between mt-1 font-smartfont3">
                <span className="text-slate-200">လုပ်ငန်းလိုအပ်ချက်တိုင်းအတွက် အကောင်းဆုံး Digital ဝန်ဆောင်မှု</span>
                <span className="text-purple-400 uppercase tracking-widest text-[10px] sm:text-xs font-black">SOLUTIONS</span>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-4 md:p-6 text-center select-none relative overflow-hidden font-smartfont3">
            <div className="absolute top-2 left-3 md:top-3 md:left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] md:text-xs font-black tracking-widest uppercase border border-white/25">
              📱 TIKTOK & BANK SERVICES
            </div>
            <div className="max-w-2xl px-2 space-y-3 md:space-y-4">
              <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-yellow-300 drop-shadow-md tracking-wide leading-normal">
                TikTok ID တင်ခြင်း
              </h3>
              <p className="text-sm sm:text-lg md:text-xl font-bold leading-relaxed text-white drop-shadow-lg">
                Bank ချိတ် service များအပ်နှံနိုင်ပါပြီ
              </p>
              <span className="inline-flex items-center gap-2 bg-black/35 backdrop-blur-md text-red-200 border border-red-500/30 py-1.5 px-5 rounded-2xl text-xs sm:text-sm font-semibold shadow">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping"></span>
                စိတ်ချယုံကြည်စွာ အပ်နှံနိုင်ပါသည်။
              </span>
            </div>
            <div className="absolute bottom-2 right-3 md:bottom-3 md:right-4 text-[10px] sm:text-xs text-amber-200 font-semibold uppercase tracking-wider">
              KC Service Partner
            </div>
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white p-4 md:p-6 text-center select-none relative overflow-hidden font-smartfont3">
            <div className="absolute top-2 left-3 md:top-3 md:left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] md:text-xs font-black tracking-widest uppercase border border-white/25">
              🤝 BUSINESS PARTNERSHIP
            </div>
            <div className="max-w-3xl px-2 space-y-3 md:space-y-4">
              <h3 className="text-xs sm:text-sm md:text-base font-bold tracking-widest text-emerald-200 uppercase">
                COOPERATION & COLLABORATION
              </h3>
              <p className="text-sm sm:text-base md:text-xl font-semibold leading-relaxed px-4 text-emerald-100">
                Smart Creator နှင့်လက်တွဲလိုသော Digital Service မိတ်ဖက် Partner များ KC Team ထံသို့ ဆက်သွယ်နိုင်ပါတယ်ခင်ဗျာ
              </p>
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-950 font-black text-xs sm:text-sm px-6 py-2 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                <span>Telegram:</span>
                <span className="underline select-text">@kcteamofficialbot</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      }
    })
  };

  return (
    <div 
      className="relative w-full overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-gray-900 group"
      id="banner-carousel-container"
    >
      {/* Redesigned responsive aspect-ratio: taller on mobile to fit text list data, sleek on desktop */}
      <div className="relative aspect-[16/10] sm:aspect-[21/8] md:aspect-[21/7] lg:aspect-[21/6] w-full min-h-[200px] xs:min-h-[220px] sm:min-h-[250px] md:min-h-[280px] max-h-[400px] overflow-hidden flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            {!failedImages[currentIndex] ? (
              <img
                src={BANNERS[currentIndex]}
                alt={`Banner ${currentIndex + 1}`}
                className="w-full h-full object-cover select-none pointer-events-none"
                onError={() => {
                  setFailedImages((prev) => ({ ...prev, [currentIndex]: true }));
                }}
              />
            ) : (
              renderFallback(currentIndex)
            )}
          </motion.div>
        </AnimatePresence>

        {/* Glassmorphic Navigation Buttons (Beautifully styled with premium permanent glassmorphic circles) */}
        <button
          onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 z-10 shadow hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Previous Slide"
          id="banner-prev-btn"
        >
          <ChevronLeft size={20} className="stroke-[2.5]" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 z-10 shadow hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Next Slide"
          id="banner-next-btn"
        >
          <ChevronRight size={20} className="stroke-[2.5]" />
        </button>

        {/* Gradient Bottom Overlay to make dots readable on light/dark backgrounds */}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

        {/* Carousel Indicators (Dots) */}
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-1.5 z-20">
          {BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              id={`banner-dot-${idx}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
