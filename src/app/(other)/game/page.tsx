'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

// The physics engine constants ⚙️
const NOTE_TRAVEL_TIME = 2000; // ms from center to death
const HIT_WINDOW_START = 1300; // ms
const HIT_WINDOW_END = 1700; // ms
const HIT_TOLERANCE_DEG = 20; // How forgiving the triangle alignment is

type Note = {
  id: string;
  side: 'LEFT' | 'RIGHT';
  angle: number;
  createdAt: number;
};

function DualScreenGame() {
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get('room');
  
  const [role, setRole] = useState<'loading' | 'desktop' | 'phone'>('loading');
  const [status, setStatus] = useState('Initializing ⏳');
  const [qrUrl, setQrUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Real-time state for rendering the UI
  const [playerState, setPlayerState] = useState({ left: false, right: false, tilt: 0 });
  
  // Game logic state
  const [notes, setNotes] = useState<Note[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  const controllerActionRef = useRef<any>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);
  const prevAngleRef = useRef({ LEFT: 180, RIGHT: 0 }); // Track last spawn angles to avoid wild jumps

  // --- DESKTOP GAME LOOP & COLLISION ---
  useEffect(() => {
    if (role !== 'desktop' || !isConnected) return;

    // 1. Spawner Engine 🎲
    const spawner = setInterval(() => {
      const roll = Math.random();
      const now = Date.now();
      const newNotes: Note[] = [];

      const getNextAngle = (side: 'LEFT' | 'RIGHT') => {
        const variance = (Math.random() * 40) - 20; // ±20 degrees from last note
        let base = prevAngleRef.current[side] + variance;
        
        // Clamp to valid arcs so they don't cross the top/bottom poles
        if (side === 'RIGHT') base = Math.max(-45, Math.min(45, base));
        if (side === 'LEFT') base = Math.max(135, Math.min(225, base));
        
        prevAngleRef.current[side] = base;
        return base;
      };

      if (roll < 0.25) {
        // DOUBLE NOTE DROP 🔥
        const rightAngle = getNextAngle('RIGHT');
        newNotes.push({ id: `R-${now}`, side: 'RIGHT', angle: rightAngle, createdAt: now });
        // The left note perfectly mirrors the right note for the double tap
        const leftAngle = rightAngle > 0 ? 180 + rightAngle : 180 + rightAngle; 
        newNotes.push({ id: `L-${now}`, side: 'LEFT', angle: leftAngle, createdAt: now });
      } else if (roll < 0.75) {
        // SINGLE NOTE 🎵
        const side = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newNotes.push({ id: `${side[0]}-${now}`, side, angle: getNextAngle(side), createdAt: now });
      }

      if (newNotes.length > 0) {
        setNotes(prev => [...prev, ...newNotes]);
      }
    }, 500);

    // 2. Garbage Collector 🧹 (Prevents memory leaks from off-screen notes)
    const cleanup = setInterval(() => {
      const now = Date.now();
      setNotes(prev => {
        const survivingNotes = prev.filter(n => now - n.createdAt < NOTE_TRAVEL_TIME + 200);
        // If a note was deleted purely by age, it means the player missed it! Drop the combo.
        if (survivingNotes.length < prev.length) setCombo(0);
        return survivingNotes;
      });
    }, 1000);

    return () => { clearInterval(spawner); clearInterval(cleanup); };
  }, [role, isConnected]);

  // --- NETWORK INITIALIZATION ---
  useEffect(() => {
    let currentRoom: any = null;

    const initializeTrystero = async () => {
      const { joinRoom } = await import('@trystero-p2p/mqtt');
      const isHost = !urlRoom;
      const roomId = urlRoom || 'game_' + Math.random().toString(36).substring(2, 9);
      
      const config = { 
        appId: 'my-campus-racer-v2',
        rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      };

      currentRoom = joinRoom(config, roomId);
      const controller = currentRoom.makeAction('controller');

      if (isHost) {
        setRole('desktop');
        setQrUrl(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
        setStatus('Waiting for DJ 🎧');

        currentRoom.onPeerJoin = (peerId: string) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setStatus('Deck Connected 💿');
            setIsConnected(true);
          }
        };

        currentRoom.onPeerLeave = (peerId: string) => {
          if (activePlayerIdRef.current === peerId) {
            activePlayerIdRef.current = null;
            setIsConnected(false);
            setStatus('Signal lost. Scan to reconnect 📡');
            setPlayerState({ left: false, right: false, tilt: 0 });
            setNotes([]);
          }
        };

        controller.onMessage = (payload: any, { peerId }: any) => {
          if (peerId !== activePlayerIdRef.current) return;
          
          setPlayerState({ left: payload.left, right: payload.right, tilt: payload.tilt });

          // Process explicit TAP events instantly ⚡
          if (payload.taps && payload.taps.length > 0) {
            handleTaps(payload.taps, payload.tilt);
          }
        };
        
      } else {
        setRole('phone');
        setStatus('Pairing to screen 🔗');
        controllerActionRef.current = controller;
        
        currentRoom.onPeerJoin = (peerId: string) => {
          hostPeerIdRef.current = peerId;
          setStatus('Ready to drop 🔥');
        };
      }
    };

    initializeTrystero();
    return () => { if (currentRoom) currentRoom.leave(); };
  }, [urlRoom]);

  // --- DESKTOP HIT DETECTION MATH ---
  const handleTaps = (taps: string[], currentTilt: number) => {
    const now = Date.now();
    
    setNotes(prevNotes => {
      let notesToKeep = [...prevNotes];
      let hitRegistered = false;

      taps.forEach(tapSide => {
        // Find the oldest note on the side that was tapped, which is currently inside the time window
        const targetNoteIndex = notesToKeep.findIndex(n => {
          const age = now - n.createdAt;
          return n.side === tapSide && age >= HIT_WINDOW_START && age <= HIT_WINDOW_END;
        });

        if (targetNoteIndex !== -1) {
          const note = notesToKeep[targetNoteIndex];
          const expectedAngle = note.side === 'LEFT' ? currentTilt + 180 : currentTilt;
          
          // Calculate the shortest mathematical distance between two angles $d = |((a - b + 540) \bmod 360) - 180|$
          const angleDiff = Math.abs(((note.angle - expectedAngle + 540) % 360) - 180);

          if (angleDiff <= HIT_TOLERANCE_DEG) {
            // HIT SUCCESS! Remove the note and score it
            notesToKeep.splice(targetNoteIndex, 1);
            hitRegistered = true;
            setScore(s => s + 100);
          }
        }
      });

      if (hitRegistered) {
        setCombo(c => c + 1);
      } else {
        // If they tapped and hit absolutely nothing, punish the spamming!
        setCombo(0);
      }
      
      return notesToKeep;
    });
  };

  // --- PHONE SENSOR & INPUT ENGINE ---
  const requestSensors = async () => {
    // 📱 Force native fullscreen and landscape lock if the browser allows it
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock('landscape');
      }
    } catch (e) {
      console.warn('Native landscape lock bypassed. Relying on CSS.', e);
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return alert('Need motion access to play 🛑');
      } catch (e) { console.error(e); }
    }
    
    window.addEventListener('deviceorientation', (e) => {
      if (!controllerActionRef.current || !hostPeerIdRef.current) return;
        
      const isNativePortrait = window.innerHeight > window.innerWidth;
      let currentTilt = isNativePortrait ? -(e.beta || 0) : ((window.screen?.orientation?.angle || window.orientation || 0) === 90 ? (e.beta || 0) : -(e.beta || 0));
      const clampedTilt = Math.max(-90, Math.min(90, currentTilt));

      // We only send the sensor update, no taps here. The continuous stream powers the UI.
      controllerActionRef.current.send({
        left: controllerActionRef.current.isLeftDown || false,
        right: controllerActionRef.current.isRightDown || false,
        tilt: Math.round(clampedTilt),
        taps: []
      }, { target: hostPeerIdRef.current });
    });
    
    setStatus('Sensors Active 🟢');
  };

  // Unified multi-touch handler for the giant invisible screen halves
  const handlePointer = (side: 'LEFT' | 'RIGHT', action: 'DOWN' | 'UP') => {
    if (!controllerActionRef.current || !hostPeerIdRef.current) return;
    
    if (side === 'LEFT') controllerActionRef.current.isLeftDown = action === 'DOWN';
    if (side === 'RIGHT') controllerActionRef.current.isRightDown = action === 'DOWN';

    // If it is a fresh press, we inject it into the tap array so the desktop scores it immediately
    const taps = action === 'DOWN' ? [side] : [];

    controllerActionRef.current.send({
      left: controllerActionRef.current.isLeftDown || false,
      right: controllerActionRef.current.isRightDown || false,
      tilt: 0, // Tilt is normally overwritten by the high-frequency sensor loop anyway
      taps: taps 
    }, { target: hostPeerIdRef.current });
  };

  // --- RENDER LAYERS ---
  if (role === 'desktop') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-hidden flex items-center justify-center font-sans">
        
        {(!isConnected || qrUrl) && !isConnected ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
            <p className="text-emerald-400 mb-8 font-mono text-2xl">{status}</p>
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <QRCodeSVG value={qrUrl} size={300} />
            </div>
          </div>
        ) : null}

        {/* HUD UI */}
        <div className="absolute top-8 left-8 text-white z-40">
          <p className="text-4xl font-black tracking-widest">{score}</p>
          <p className={`text-xl font-mono ${combo > 5 ? 'text-orange-400 animate-pulse' : 'text-slate-500'}`}>
            {combo} COMBO
          </p>
        </div>

        {/* The Target "Hit Ring" Layer (Scaled relative to viewport width) */}
        <div className="absolute w-[60vw] h-[60vw] rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)] pointer-events-none" />

        {/* The Notes Render Layer */}
        {notes.map(note => (
          <div 
            key={note.id}
            className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full shadow-[0_0_20px_currentColor] z-30"
            style={{
              color: note.side === 'LEFT' ? '#3b82f6' : '#ec4899',
              backgroundColor: 'currentColor',
              // 🔗 INJECT THE CSS VARIABLE HERE (Cast as React.CSSProperties for TS)
              '--angle': `${note.angle}deg`, 
              animation: `flyOut ${NOTE_TRAVEL_TIME}ms linear forwards`,
              transformOrigin: '0 0',
            } as React.CSSProperties} 
          />
        ))}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flyOut {
            0% { transform: rotate(var(--angle)) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(50vw); opacity: 0; }
          }
        `}} />

        {/* The Massive Arena Circle */}
        <div className="absolute w-[150vw] h-[150vw] rounded-full border-[4px] border-slate-800/80 flex overflow-hidden shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-10">
          <div className={`w-1/2 h-full transition-colors duration-75 ${playerState.left ? 'bg-blue-600/30 shadow-[0_0_150px_rgba(37,99,235,0.5)]' : 'bg-slate-900/10'}`} />
          <div className={`w-1/2 h-full transition-colors duration-75 ${playerState.right ? 'bg-pink-600/30 shadow-[0_0_150px_rgba(219,39,119,0.5)]' : 'bg-slate-900/10'}`} />
        </div>

        {/* The Rotating Player Triangles */}
        <div 
          className="absolute w-full px-[20vw] flex justify-between items-center transition-transform duration-75 ease-out z-20"
          style={{ transform: `rotate(${playerState.tilt}deg)` }}
        >
          {/* Connecting horizon line */}
          <div className="absolute inset-x-0 h-[2px] bg-slate-800/40 -z-10 mx-[20vw]" />
          
          <div className={`w-0 h-0 border-y-[30px] border-y-transparent border-l-[60px] transition-all duration-75 ${playerState.left ? 'border-l-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,1)] scale-125' : 'border-l-slate-700'}`} />
          <div className={`w-0 h-0 border-y-[30px] border-y-transparent border-r-[60px] transition-all duration-75 ${playerState.right ? 'border-r-pink-500 drop-shadow-[0_0_40px_rgba(236,72,153,1)] scale-125' : 'border-r-slate-700'}`} />
        </div>
      </div>
    );
  }

  // --- RENDER PHONE (THE INVISIBLE TOUCH DECK) ---
  if (role === 'phone') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-hidden touch-none select-none">
        
        {/* Bulletproof center-pivot container. Forces landscape layout perfectly regardless of URL bars. */}
        <div className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] sm:w-[100vw] sm:h-[100vh] -translate-x-1/2 -translate-y-1/2 portrait:-rotate-90 landscape:rotate-0 flex">
          
          {!status.includes('Active') ? (
            // Notice this inner container rotates BACK to upright in portrait so the text is easily readable!
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-slate-950/90 portrait:rotate-90 landscape:rotate-0">
              <p className="text-emerald-400 mb-8 font-mono text-xl text-center">{status}</p>
              {status.includes('Ready') && (
                <button 
                  onClick={requestSensors} 
                  className="px-12 py-6 bg-emerald-500 active:bg-emerald-400 text-slate-900 font-bold rounded-full text-2xl animate-pulse shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                >
                  START DECK
                </button>
              )}
            </div>
          ) : null}

          <div 
            onPointerDown={() => handlePointer('LEFT', 'DOWN')}
            onPointerUp={() => handlePointer('LEFT', 'UP')}
            onPointerCancel={() => handlePointer('LEFT', 'UP')}
            className="flex-1 h-full w-full bg-blue-500/10 active:bg-blue-600/40 border-r-2 border-slate-800/50"
          />
          <div 
            onPointerDown={() => handlePointer('RIGHT', 'DOWN')}
            onPointerUp={() => handlePointer('RIGHT', 'UP')}
            onPointerCancel={() => handlePointer('RIGHT', 'UP')}
            className="flex-1 h-full w-full bg-pink-500/10 active:bg-pink-600/40"
          />
          
          <div className="absolute top-0 bottom-0 left-1/2 w-1 -ml-[0.5px] bg-slate-800/50 pointer-events-none" />
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