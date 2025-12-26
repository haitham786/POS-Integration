
import React, { useState, useEffect, useCallback } from 'react';
import { 
  buildFrame, 
  buildPurchaseXml, 
  parseResponse 
} from './services/ecrProtocol';
import { NativeBridge } from './services/nativeBridge';
import { EftResponse, INTERMEDIATE_MESSAGES } from './types';

export default function App() {
  const [amount, setAmount] = useState<string>("0.000");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("Ready to donate");
  const [hwStatus, setHwStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [transactionResult, setTransactionResult] = useState<Partial<EftResponse> | null>(null);
  
  const bridge = NativeBridge.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      const connected = bridge.checkConnection();
      setHwStatus(connected ? 'connected' : 'disconnected');
    }, 1500);
    return () => clearInterval(interval);
  }, [bridge]);

  const handleDonate = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setCurrentStatus("Enter an amount first");
      return;
    }

    if (hwStatus === 'disconnected' && bridge.isNativeAvailable()) {
      bridge.requestPermission();
      setCurrentStatus("Initializing POS...");
    }

    setIsProcessing(true);
    setTransactionResult(null);
    setCurrentStatus("Check POS Terminal...");
    
    const xml = buildPurchaseXml(numAmount);
    const frame = buildFrame(xml);
    
    bridge.sendCommand(frame, (rawResponse) => {
      const parsed = parseResponse(rawResponse);
      setTransactionResult(parsed);
      setIsProcessing(false);
      
      if (parsed.responseCode === 'APPROVED') {
        setCurrentStatus("Thank You!");
      } else {
        setCurrentStatus(`Error: ${parsed.errorCode || 'Declined'}`);
      }
    });
  };

  const handleKeypad = (val: string) => {
    if (isProcessing) return;
    if (val === 'CLEAR') {
      setAmount("0.000");
      return;
    }
    setAmount(prev => {
      const clean = prev.replace('.', '');
      const next = (parseInt(clean + val) / 1000).toFixed(3);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1e] text-white overflow-hidden font-sans">
      <div className="p-6 flex justify-between items-center bg-[#111827] border-b border-white/5 shadow-lg relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-900/20">
            <i className="fas fa-hand-holding-heart"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Oman Charity</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Kiosk #OM-A880</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => bridge.requestPermission()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all active:scale-95 ${
              hwStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <i className={`fas ${hwStatus === 'connected' ? 'fa-link' : 'fa-plug'}`}></i>
            <span className="text-sm font-bold tracking-wider">
              {hwStatus === 'connected' ? 'CONNECTED' : 'RECONNECT POS'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative z-10">
        <div className="w-full max-w-xl bg-[#111827] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl text-center">
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm mb-4">Donation Amount</p>
            <div className="flex items-baseline justify-center gap-3 mb-6">
                <span className="text-4xl font-light text-slate-400">OMR</span>
                <span className="text-8xl font-black text-emerald-500 tabular-nums tracking-tighter">{amount}</span>
            </div>
            
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-lg font-bold transition-all ${
                isProcessing ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 'bg-slate-800 text-slate-300 shadow-inner'
            }`}>
                {isProcessing && <i className="fas fa-spinner fa-spin"></i>}
                {currentStatus}
            </div>
        </div>

        <div className="w-full max-w-xl grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLEAR', 0, 'DONE'].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'DONE') handleDonate();
                else if (key === 'CLEAR') handleKeypad('CLEAR');
                else handleKeypad(key.toString());
              }}
              disabled={isProcessing}
              className={`
                h-20 rounded-3xl text-2xl font-black transition-all active:scale-95 flex items-center justify-center
                ${key === 'DONE' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 
                  key === 'CLEAR' ? 'bg-red-900/20 text-red-400 border border-red-500/20' : 
                  'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5'}
                disabled:opacity-50 disabled:grayscale
              `}
            >
              {key === 'CLEAR' ? <i className="fas fa-backspace text-xl"></i> : key}
            </button>
          ))}
        </div>

        <button 
          onClick={handleDonate}
          disabled={isProcessing || parseFloat(amount) <= 0}
          className="w-full max-w-xl py-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-3xl text-2xl font-black shadow-xl shadow-emerald-900/20 transition-all transform active:scale-[0.98] uppercase tracking-widest"
        >
          {isProcessing ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>

      {transactionResult?.responseCode === 'APPROVED' && (
        <div className="fixed inset-0 z-50 bg-[#0a0f1e]/98 flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center max-w-md bg-[#111827] p-12 rounded-[3rem] border border-emerald-500/20 shadow-2xl">
                <div className="w-32 h-32 bg-emerald-500 rounded-full mx-auto flex items-center justify-center text-6xl mb-8 animate-bounce">
                    <i className="fas fa-check"></i>
                </div>
                <h2 className="text-5xl font-black mb-4 tracking-tight">Barak Allah!</h2>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed italic">Your donation of OMR {amount} was successful.</p>
                <button 
                    onClick={() => {
                        setTransactionResult(null);
                        setAmount("0.000");
                        setCurrentStatus("Ready to donate");
                    }}
                    className="w-full py-5 bg-emerald-500 text-[#0a0f1e] rounded-3xl font-black text-xl hover:bg-emerald-400 transition-colors"
                >
                    DONE
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
