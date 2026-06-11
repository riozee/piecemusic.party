'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

function DualScreenGame() {
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get('room');
  
  const [role, setRole] = useState<'loading' | 'desktop' | 'phone'>('loading');
  const [status, setStatus] = useState('Initializing ⏳');
  const [qrUrl, setQrUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [playerInput, setPlayerInput] = useState({ button: 'NONE', alpha: 0, beta: 0, gamma: 0 });
  
  const controllerActionRef = useRef<any>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let currentRoom: any = null;

    const initializeTrystero = async () => {
      const { joinRoom } = await import('@trystero-p2p/mqtt');
      
      const isHost = !urlRoom;
      const roomId = urlRoom || 'game_' + Math.random().toString(36).substring(2, 9);
      
      const config = { 
        appId: 'my-campus-racer-v1',
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        }
      };

      currentRoom = joinRoom(config, roomId);
      
      // The modern v0.25+ action object API 📦
      const controller = currentRoom.makeAction('controller');

      if (isHost) {
        setRole('desktop');
        setQrUrl(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
        setStatus('Waiting for controller 📡');

        // Event listeners are now direct nullable properties instead of function wrappers
        currentRoom.onPeerJoin = (peerId: string) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setStatus('Controller Connected 🎮');
            setIsConnected(true);
          }
        };

        currentRoom.onPeerLeave = (peerId: string) => {
          if (activePlayerIdRef.current === peerId) {
            activePlayerIdRef.current = null;
            setIsConnected(false);
            setStatus('Connection lost. Scan to reconnect 🔄');
            setPlayerInput({ button: 'NONE', alpha: 0, beta: 0, gamma: 0 });
          }
        };

        controller.onMessage = (data: any, { peerId }: any) => {
          // Only process inputs from the active player to prevent hijacking 🛑
          if (peerId === activePlayerIdRef.current) {
            setPlayerInput(data);
          }
        };
        
      } else {
        setRole('phone');
        setStatus('Connecting to screen 🚀');
        controllerActionRef.current = controller;
        
        currentRoom.onPeerJoin = (peerId: string) => {
          hostPeerIdRef.current = peerId;
          setStatus('Ready to play. Tap Start 🔥');
        };
      }
    };

    initializeTrystero();

    return () => {
      if (currentRoom) currentRoom.leave();
    };
  }, [urlRoom]);

  const requestSensors = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return alert('Need motion access to play 🛑');
      } catch (e) {
        console.error(e);
      }
    }
    
    window.addEventListener('deviceorientation', (e) => {
      if (controllerActionRef.current && hostPeerIdRef.current) {
        // Explicitly targeting the host prevents broadcasting data to other phones in the room 🎯
        controllerActionRef.current.send({
          button: controllerActionRef.current.lastButton || 'NONE',
          alpha: Math.round(e.alpha || 0),
          beta: Math.round(e.beta || 0),
          gamma: Math.round(e.gamma || 0)
        }, { target: hostPeerIdRef.current });
      }
    });
    setStatus('Sensors Active 🏁');
  };

  const handleButton = (btn: string) => {
    if (controllerActionRef.current) controllerActionRef.current.lastButton = btn;
  };

  if (role === 'desktop') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 font-sans">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Main Display</h1>
        <p className="text-emerald-400 mb-8 font-mono">{status}</p>

        {qrUrl && !isConnected ? (
          <div className="bg-white p-6 rounded-2xl shadow-2xl">
            <QRCodeSVG value={qrUrl} size={300} />
            <p className="text-slate-900 text-center mt-4 font-bold">Scan to Connect</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
            <div className="grid grid-cols-2 gap-8 text-center">
              <div className="bg-slate-900 p-6 rounded-xl">
                <p className="text-slate-400 mb-2 uppercase tracking-widest text-sm">Active Button</p>
                <p className="text-6xl font-black text-blue-400">{playerInput.button}</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl flex flex-col justify-center items-center gap-2">
                <p className="text-slate-400 uppercase tracking-widest text-sm">Orientation</p>
                <p className="text-xl font-mono text-pink-400">Z: {playerInput.alpha}°</p>
                <p className="text-xl font-mono text-purple-400">X: {playerInput.beta}°</p>
                <p className="text-xl font-mono text-indigo-400">Y: {playerInput.gamma}°</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (role === 'phone') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none touch-none">
        <p className="text-emerald-400 mb-8 font-mono text-center">{status}</p>
        
        {status.includes('Ready') && (
          <button 
            onClick={requestSensors}
            className="mb-12 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full text-xl transition-colors shadow-lg shadow-emerald-500/30"
          >
            Start Sensors
          </button>
        )}

        <div className="flex w-full gap-4 max-w-md h-48">
          <button 
            onTouchStart={() => handleButton('LEFT')}
            onTouchEnd={() => handleButton('NONE')}
            className="flex-1 bg-blue-500/20 border-2 border-blue-500 rounded-3xl active:bg-blue-500 text-blue-500 active:text-white transition-all text-2xl font-bold"
          >
            LEFT
          </button>
          <button 
             onTouchStart={() => handleButton('RIGHT')}
             onTouchEnd={() => handleButton('NONE')}
            className="flex-1 bg-pink-500/20 border-2 border-pink-500 rounded-3xl active:bg-pink-500 text-pink-500 active:text-white transition-all text-2xl font-bold"
          >
            RIGHT
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <DualScreenGame />
    </Suspense>
  );
}