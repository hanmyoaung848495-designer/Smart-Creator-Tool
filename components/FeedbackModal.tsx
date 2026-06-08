
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card, Input } from './Shared';

export const FeedbackModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
  });

  const [sessionId, setSessionId] = useState('');

  // Helper function to screen for profanity with False Positive Protection
  const hasProfanity = (text: string): boolean => {
    if (!text) return false;

    // 1. English Core & Symbols (using word boundaries to protect words like "shitake")
    const englishRegexes = [
      /\b(fuck|fucking|fucker|motherfucker|bitch|bastard|asshole|dick|pussy|shit|cunt|wanker|twat|slut|whore|fuxk|fck|mft)\b/i,
      /\b(f\*ck|f\*\*k|fu\*k|b\*tch|sh\*t|a\$\$hole|f0ck|fvck)\b/i,
      /\bf\.u\.c\.k\b/i,
      /\b(f\s+u\s+c\s+k)\b/i,
      /\b(b\s+i\s+t\s+c\s+h)\b/i,
      /\b(s\s+h\s+i\s+t)\b/i,
      /\b(a\s+s\s+s\s+h\s+o\s+l\s+e)\b/i
    ];

    for (const regex of englishRegexes) {
      if (regex.test(text)) {
        return true;
      }
    }

    // Normalize Burmese by stripping spaces, zero-width spaces, and select punctuation to counter character spacing bypass
    const normalizedBurmese = text.replace(/[\s\u200B\u200C\u200D\uFEFF]/g, '');

    const burmeseProfanities = [
      // 1. Burmese Core & Variations (Unicode & Zawgyi)
      "လီး", "လိုး", "စောက်", "စောက်ဖုတ်", "စောက်ပတ်", "လီးပဲ", "လီးလား", "ခွေးမသား", "ဖာသည်", "ဖာမ", "လိုးမသား", "စောက်ရူး", "စောက်ခွက်", "စောက်ကန်း", "ငါလိုး", "ငါိုး",
      "လီပဲ", "လးပဲ", "လီးဘဲ", "လိုးမလို့", "လိုးမာလား", "စောက်ရူူး", "လိ", "လိလာ", "လိလား",

      // Zawgyi representations for fonts compatibility
      "ေစာက္", "ေစါက္", "ေစာက်", 
      "ေစာက္ပတ္", "ေစာက္ပတ်", "ေစာက်ပတ်", 
      "ေစာက္ဖုတ္", "ေစာက္ဖုတ်", "ေစာက်ဖုတ်", 
      "ေသာက္ရူး", "ေသာက်ရူး", 
      "ေသာက္ခြက္", "ေသာက်ခွက်", 
      "ေသာက္ဖုတ္", "ေသာက်ဖုတ်", 
      "ေသာက္ပတ္", "ေသာက်ပတ်", 
      "ေခြးမသား", "လုိးမသား", "ဖာသည္",

      // 2. Burmese Family Insults (Unicode & Zawgyi equivalents)
      "မအေလိုး", "နှမလိုး", "မအေဘေး", "မအေပေး", "နှမပေး", "ညီမလိုး", "မအေလိုးမသား", "မအေလိုးလေး", "မအေခွေးလိုး",
      "မေအလိုး", "မေအလုိး", "မေအေဘး", "မေအေပး", "မေအလိုးး", "မေအလိုးမ", "မေအလိုးကောင်", "မအေ၁ိုး", "မအေခွေး", "မအေရိုး", "မအေရိုးမသား",
      "ႏွမေပး", "ႏွမလိုး", "ႏွမလုိး", "ညီမလိုး", "ညီမလုိး",

      // Variations containing "သောက်" insults to avoid matching innocent words like "သောက်ရေ" (drinking water)
      "သောက်ရူး", "သောက်ခွက်", "သောက်ဖုတ်", "သောက်ပတ်",

      // 5. Transliterated English (Protected from false positives on "စာဖတ်" - read, or "ရှစ်" - 8)
      "ဖတ်ခ်", "ဖက်ခ်", "ဖက္ကင်း", "ဖတ်ကင်း", "ဘစ်ချ်", "ဘတ်စ်တပ်", "အက်စ်ဟိုး"
    ];

    for (const word of burmeseProfanities) {
      if (normalizedBurmese.includes(word)) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    let id = localStorage.getItem('smart_creator_session_id');
    if (!id) {
      id = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('smart_creator_session_id', id);
    }
    setSessionId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.message) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်အားလုံး ဖြည့်စွက်ပေးပါ');
      return;
    }

    if (hasProfanity(formData.name) || hasProfanity(formData.contact) || hasProfanity(formData.message)) {
      setError('ညစ်ညမ်းစကားလုံးများ ပါဝင်နေသဖြင့် ပို့၍မရပါ။ ကျေးဇူးပြု၍ ယဉ်ကျေးစွာ ပြန်လည်ရေးသားပေးပါ။');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          message: formData.message,
          sessionId: sessionId
        })
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: '', contact: '', message: '' });
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'ပို့ဆောင်မှု မအောင်မြင်ပါ');
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setError(`ကွန်ရက် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors"
        title="Feedback & Support"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm"
            >
              <Card className="relative overflow-hidden border-orange-100 shadow-2xl">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">အကြံပြုစာများ</h3>
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Feedback & Support</p>
                    </div>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {success ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-8 text-center space-y-3"
                    >
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <Send size={24} />
                      </div>
                      <h4 className="text-md font-bold text-gray-900 dark:text-white">ပေးပို့မှု အောင်မြင်ပါသည်</h4>
                      <p className="text-xs text-gray-500">ကျေးဇူးတင်ရှိပါသည်။</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">နာမည်</label>
                        <Input 
                          placeholder="သင်၏ နာမည်"
                          value={formData.name}
                          onChange={(val) => setFormData({ ...formData, name: val })}
                          className="border-gray-100 text-sm py-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telegram Acc/Phone No</label>
                        <Input 
                          placeholder="ဆက်သွယ်ရန်အကောင့်/ဖုန်းနံပါတ်"
                          value={formData.contact}
                          onChange={(val) => setFormData({ ...formData, contact: val })}
                          className="border-gray-100 text-sm py-2"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">မက်ဆေ့ချ်</label>
                        <textarea 
                          placeholder="အကြံပြုလိုသည်များကို ရေးသားပါ..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full min-h-[100px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>

                      {error && (
                        <p className="text-[10px] font-bold text-red-500 text-center">{error}</p>
                      )}

                      <Button 
                        type="submit"
                        disabled={isSending}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-[0.1em] shadow-lg shadow-orange-100 dark:shadow-none text-sm"
                      >
                        {isSending ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Send size={16} />
                            Send
                          </div>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
