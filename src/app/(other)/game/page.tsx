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
  
  // Cleaned up the input state to just take the raw tilt degree 📐
  const [playerInput, setPlayerInput] = useState({ button: 'NONE', tilt: 0 });
  
  const controllerActionRef = useRef<any>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let currentRoom: any = null;

    const initializeTrystero = async () => {
      const { joinRoom } = await import('@trystero-p2p/mqtt');
      
      const isHost = !urlRoom;
      const roomId = urlRoom || 'piecemusicgame_' + Math.random().toString(36).substring(2, 9);
      
      const config = { 
        appId: 'my-campus-racer-v1',
        rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      };

      currentRoom = joinRoom(config, roomId);
      const controller = currentRoom.makeAction('controller');

      if (isHost) {
        setRole('desktop');
        setQrUrl(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
        setStatus('Waiting for driver 🏎️');

        currentRoom.onPeerJoin = (peerId: string) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setStatus('Engine Connected 🏁');
            setIsConnected(true);
          }
        };

        currentRoom.onPeerLeave = (peerId: string) => {
          if (activePlayerIdRef.current === peerId) {
            activePlayerIdRef.current = null;
            setIsConnected(false);
            setStatus('Signal lost. Scan to reconnect 📡');
            setPlayerInput({ button: 'NONE', tilt: 0 });
          }
        };

        controller.onMessage = (data: any, { peerId }: any) => {
          if (peerId === activePlayerIdRef.current) {
            setPlayerInput(data);
          }
        };
        
      } else {
        setRole('phone');
        setStatus('Pairing to screen 🔗');
        controllerActionRef.current = controller;
        
        currentRoom.onPeerJoin = (peerId: string) => {
          hostPeerIdRef.current = peerId;
          setStatus('Ready to race 🔥');
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
        if (permission !== 'granted') return alert('Need motion access to steer 🛑');
      } catch (e) {
        console.error(e);
      }
    }
    
    window.addEventListener('deviceorientation', (e) => {
      if (controllerActionRef.current && hostPeerIdRef.current) {
        
        const isNativePortrait = window.innerHeight > window.innerWidth;
        let currentTilt = 0;
        
        if (isNativePortrait) {
          // Flipped the sign to negative to invert the steering 🔄
          currentTilt = -(e.beta || 0); 
        } else {
          const angle = window.screen?.orientation?.angle || window.orientation || 0;
          // Flipped both of these signs as well to match the inverted logic
          currentTilt = angle === 90 ? (e.beta || 0) : -(e.beta || 0);
        }

        // The mechanical steering rack lock 🛑
        let clampedTilt = Math.max(-90, Math.min(90, currentTilt));

        controllerActionRef.current.send({
          button: controllerActionRef.current.lastButton || 'NONE',
          tilt: Math.round(clampedTilt)
        }, { target: hostPeerIdRef.current });
      }
    });
    setStatus('Sensors Active 🟢');
  };

  const handleButton = (btn: string) => {
    if (controllerActionRef.current) controllerActionRef.current.lastButton = btn;
  };

  if (role === 'desktop') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-hidden flex items-center justify-center font-sans">
        
        {(!isConnected || qrUrl) && !isConnected ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
            <p className="text-emerald-400 mb-8 font-mono text-2xl">{status}</p>
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <QRCodeSVG value={qrUrl} size={300} />
            </div>
            <p className="text-slate-400 mt-6 font-bold tracking-widest uppercase">Scan to Connect</p>
          </div>
        ) : null}

        {/* --- MAIN GAME UI --- */}
        
        {/* The massive circle (150vw = 3/4 viewport radius) pushed heavily off the top/bottom of the screen */}
        <div className="absolute w-[150vw] h-[150vw] rounded-full border-[4px] border-slate-800/80 flex overflow-hidden shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]">
          {/* Left half glows blue when active */}
          <div className={`w-1/2 h-full transition-colors duration-150 ${playerInput.button === 'LEFT' ? 'bg-blue-600/40 shadow-[0_0_150px_rgba(37,99,235,0.6)]' : 'bg-slate-900/10'}`} />
          {/* Right half glows pink when active */}
          <div className={`w-1/2 h-full transition-colors duration-150 ${playerInput.button === 'RIGHT' ? 'bg-pink-600/40 shadow-[0_0_150px_rgba(219,39,119,0.6)]' : 'bg-slate-900/10'}`} />
        </div>

        {/* The rotating horizon line connecting the triangles */}
        <div 
          className="absolute w-full px-12 md:px-24 lg:px-40 flex justify-between items-center transition-transform duration-75 ease-out"
          style={{ transform: `rotate(${playerInput.tilt}deg)` }}
        >
          {/* A subtle horizontal line to visually anchor the 0-degree resting state */}
          <div className="absolute inset-x-0 h-[2px] bg-slate-800/60 -z-10 mx-24 md:mx-36" />
          
          <div className={`w-0 h-0 border-y-[40px] border-y-transparent border-l-[80px] transition-all duration-150 ${playerInput.button === 'LEFT' ? 'border-l-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,1)] scale-110' : 'border-l-slate-700'}`} />
          <div className={`w-0 h-0 border-y-[40px] border-y-transparent border-r-[80px] transition-all duration-150 ${playerInput.button === 'RIGHT' ? 'border-r-pink-500 drop-shadow-[0_0_40px_rgba(236,72,153,1)] scale-110' : 'border-r-slate-700'}`} />
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 font-mono text-sm tracking-widest">
          TILT: {playerInput.tilt}°
        </div>
      </div>
    );
  }

  if (role === 'phone') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-hidden touch-none select-none flex items-center justify-center">
        
        {/* Magic Tailwind Container: Uses native landscape if available, otherwise fakes it by rotating a swapped portrait container 90 degrees */}
        <div className="relative flex gap-6 p-6 w-full h-full landscape:flex-row portrait:flex-col portrait:w-[100vh] portrait:h-[100vw] portrait:-rotate-90 portrait:flex-row items-center justify-center">
          
          {!status.includes('Active') ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-slate-950/90 backdrop-blur-sm rounded-3xl">
              <p className="text-emerald-400 mb-8 font-mono text-xl">{status}</p>
              {status.includes('Ready') && (
                <button 
                  onClick={requestSensors}
                  className="px-12 py-6 bg-emerald-500 text-slate-900 font-bold rounded-full text-2xl animate-pulse shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                >
                  START ENGINE
                </button>
              )}
            </div>
          ) : null}

          {/* Massive tap targets built for peripheral vision. Added touchCancel to prevent ghost inputs if a thumb slides off. */}
          <button 
            onTouchStart={() => handleButton('LEFT')}
            onTouchEnd={() => handleButton('NONE')}
            onTouchCancel={() => handleButton('NONE')}
            onMouseDown={() => handleButton('LEFT')}
            onMouseUp={() => handleButton('NONE')}
            className="flex-1 h-full max-h-[500px] w-full bg-blue-500/10 border-4 border-blue-500/30 rounded-[3rem] active:bg-blue-600 active:border-blue-400 text-blue-500/50 active:text-white transition-all text-6xl font-black tracking-widest flex items-center justify-center active:shadow-[inset_0_0_80px_rgba(59,130,246,0.6),0_0_100px_rgba(59,130,246,0.8)]"
          >
            L
          </button>
          <button 
            onTouchStart={() => handleButton('RIGHT')}
            onTouchEnd={() => handleButton('NONE')}
            onTouchCancel={() => handleButton('NONE')}
            onMouseDown={() => handleButton('RIGHT')}
            onMouseUp={() => handleButton('NONE')}
            className="flex-1 h-full max-h-[500px] w-full bg-pink-500/10 border-4 border-pink-500/30 rounded-[3rem] active:bg-pink-600 active:border-pink-400 text-pink-500/50 active:text-white transition-all text-6xl font-black tracking-widest flex items-center justify-center active:shadow-[inset_0_0_80px_rgba(236,72,153,0.6),0_0_100px_rgba(236,72,153,0.8)]"
          >
            R
          </button>
        </div>
      </div>
    );
  }

  return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <DualScreenGame />
    </Suspense>
  );
}