'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const NOTE_TRAVEL_TIME = 2000; 
const HIT_WINDOW_START = 900; 
const HIT_WINDOW_END = 1500; 
const HIT_TOLERANCE_DEG = 45; 
const NETWORK_THROTTLE_MS = 16; 

type Note = { id: string; side: 'LEFT' | 'RIGHT'; angle: number; createdAt: number; type: 'SINGLE' | 'DOUBLE'; missed?: boolean; };
type HitFeedback = { id: string; angle: number; };

function DualScreenGame() {
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get('room');
  
  const [role, setRole] = useState<'loading' | 'desktop' | 'phone'>('loading');
  const [status, setStatus] = useState('Initializing ⏳');
  const [qrUrl, setQrUrl] = useState('');
  
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [playerState, setPlayerState] = useState({ left: false, right: false });
  const [notes, setNotes] = useState<Note[]>([]);
  const [hits, setHits] = useState<HitFeedback[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  const steeringContainerRef = useRef<HTMLDivElement>(null);
  
  const sendActionRef = useRef<any>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);
  const prevAngleRef = useRef({ LEFT: 180, RIGHT: 0 }); 
  
  const phoneStateRef = useRef({ left: false, right: false, tilt: 0 });
  const lastSendTimeRef = useRef(0);
  const lastSentTiltRef = useRef(0);
  const sensorsStartedRef = useRef(false);

  // --- DESKTOP GAME LOOP ---
  useEffect(() => {
    if (role !== 'desktop' || !isConnected || !isPlaying) return;

    const spawner = setInterval(() => {
      const roll = Math.random();
      const now = Date.now();
      const newNotes: Note[] = [];

      const getNextAngle = (side: 'LEFT' | 'RIGHT') => {
        const variance = (Math.random() * 40) - 20; 
        let base = prevAngleRef.current[side] + variance;
        if (side === 'RIGHT') base = Math.max(-45, Math.min(45, base));
        if (side === 'LEFT') base = Math.max(135, Math.min(225, base));
        prevAngleRef.current[side] = base;
        return base;
      };

      if (roll < 0.25) {
        const rightAngle = getNextAngle('RIGHT');
        newNotes.push({ id: `R-${now}`, side: 'RIGHT', angle: rightAngle, createdAt: now, type: 'DOUBLE' });
        newNotes.push({ id: `L-${now}`, side: 'LEFT', angle: rightAngle + 180, createdAt: now, type: 'DOUBLE' });
      } else if (roll < 0.75) {
        const side = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newNotes.push({ id: `${side[0]}-${now}`, side, angle: getNextAngle(side), createdAt: now, type: 'SINGLE' });
      }

      if (newNotes.length > 0) setNotes(prev => [...prev, ...newNotes]);
    }, 1000);

    const cleanup = setInterval(() => {
      const now = Date.now();
      setNotes(prev => {
        let dropped = false;
        const next = prev.map(n => {
          if (!n.missed && now - n.createdAt > HIT_WINDOW_END) {
            dropped = true;
            return { ...n, missed: true };
          }
          return n;
        }).filter(n => now - n.createdAt < NOTE_TRAVEL_TIME + 200); 
        
        if (dropped) setTimeout(() => setCombo(0), 0);
        return next;
      });
    }, 200);

    return () => { clearInterval(spawner); clearInterval(cleanup); };
  }, [role, isConnected, isPlaying]);

  // --- NETWORK INITIALIZATION ---
  useEffect(() => {
    let currentRoom: any = null;

    const initializeTrystero = async () => {
      const { joinRoom } = await import('@trystero-p2p/mqtt');
      const isHost = !urlRoom;
      const roomId = urlRoom || 'game_' + Math.random().toString(36).substring(2, 9);
      
      const config = { 
        appId: 'my-campus-racer-v4', 
        rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      };

      currentRoom = joinRoom(config, roomId);
      const controllerAction = currentRoom.makeAction('controller');

      if (isHost) {
        setRole('desktop');
        setQrUrl(`${window.location.origin}${window.location.pathname}?room=${roomId}`);
        setStatus('Waiting for DJ 🎧');

        currentRoom.onPeerJoin = (peerId: string) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setStatus('Deck Connected. Waiting for START 💿');
            setIsConnected(true);
          }
        };

        currentRoom.onPeerLeave = (peerId: string) => {
          if (activePlayerIdRef.current === peerId) {
            activePlayerIdRef.current = null;
            setIsConnected(false);
            setIsPlaying(false);
            setStatus('Signal lost. Scan to reconnect 📡');
            setPlayerState({ left: false, right: false });
            setNotes([]);
          }
        };

        controllerAction.onMessage = (payload: any, { peerId }: any) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setIsConnected(true);
          }
          if (peerId !== activePlayerIdRef.current) return;
          
          if (payload.action === 'START') {
            setStatus('GAME ON 🔥');
            setIsPlaying(true);
            return;
          }
          
          if (steeringContainerRef.current) {
            steeringContainerRef.current.style.transform = `rotate(${payload.tilt}deg)`;
          }
          
          setPlayerState(prev => {
            if (prev.left !== payload.left || prev.right !== payload.right) {
              return { left: payload.left, right: payload.right };
            }
            return prev;
          });

          if (payload.taps && payload.taps.length > 0) handleTaps(payload.taps, payload.tilt);
        };
        
      } else {
        setRole('phone');
        setStatus('Pairing to screen 🔗');
        sendActionRef.current = controllerAction; 
        
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
      const newHits: HitFeedback[] = [];

      taps.forEach(tapSide => {
        const targetNoteIndex = notesToKeep.findIndex(n => {
          const age = now - n.createdAt;
          return n.side === tapSide && !n.missed && age >= HIT_WINDOW_START && age <= HIT_WINDOW_END;
        });

        if (targetNoteIndex !== -1) {
          const note = notesToKeep[targetNoteIndex];
          const expectedAngle = note.side === 'LEFT' ? currentTilt + 180 : currentTilt;
          const angleDiff = Math.abs(((note.angle - expectedAngle + 540) % 360) - 180);

          if (angleDiff <= HIT_TOLERANCE_DEG) {
            notesToKeep.splice(targetNoteIndex, 1);
            hitRegistered = true;
            setScore(s => s + 100);
            
            const uniqueSuffix = Math.random().toString(36).substring(2, 6);
            const hitId = `${now}-${tapSide}-${uniqueSuffix}`;
            
            newHits.push({ id: hitId, angle: note.angle });
            setTimeout(() => setHits(h => h.filter(x => x.id !== hitId)), 300);
          }
        }
      });

      if (hitRegistered) setCombo(c => c + 1);
      else if (taps.length > 0) setCombo(0); 
      
      if (newHits.length > 0) setHits(prev => [...prev, ...newHits]);
      return notesToKeep;
    });
  };

  // --- PHONE SENSOR ENGINE ---
  const requestSensors = async () => {
    if (sensorsStartedRef.current) return;

    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      const screenOrientation = window.screen?.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        await screenOrientation.lock('landscape');
      }
    } catch (e) { console.warn('Native landscape lock bypassed', e); }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return alert('Need motion access to play 🛑');
      } catch (e) { console.error(e); }
    }
    
    sensorsStartedRef.current = true;
    if (sendActionRef.current && hostPeerIdRef.current) {
      sendActionRef.current.send({ action: 'START' }, { target: hostPeerIdRef.current });
    }
    
    window.addEventListener('deviceorientation', (e) => {
      if (!sendActionRef.current || !hostPeerIdRef.current) return;
        
      const now = Date.now();
      const isNativePortrait = window.innerHeight > window.innerWidth;
      let currentTilt = isNativePortrait ? -(e.beta || 0) : ((window.screen?.orientation?.angle || window.orientation || 0) === 90 ? (e.beta || 0) : -(e.beta || 0));
      
      const rawTilt = Math.max(-90, Math.min(90, currentTilt));
      const clampedTilt = Math.round(rawTilt * 10) / 10; 

      phoneStateRef.current.tilt = clampedTilt;

      if (now - lastSendTimeRef.current >= NETWORK_THROTTLE_MS) {
        if (clampedTilt !== lastSentTiltRef.current) {
          lastSendTimeRef.current = now;
          lastSentTiltRef.current = clampedTilt;

          sendActionRef.current.send({
            left: phoneStateRef.current.left,
            right: phoneStateRef.current.right,
            tilt: clampedTilt,
            taps: [] 
          }, { target: hostPeerIdRef.current });
        }
      }
    });
    
    setStatus('Sensors Active 🟢');
  };

  // --- PHONE TOUCH ENGINE ---
  const handlePointer = (side: 'LEFT' | 'RIGHT', action: 'DOWN' | 'UP') => {
    if (!sendActionRef.current || !hostPeerIdRef.current) return;
    
    if (side === 'LEFT') phoneStateRef.current.left = action === 'DOWN';
    if (side === 'RIGHT') phoneStateRef.current.right = action === 'DOWN';

    const taps = action === 'DOWN' ? [side] : [];

    sendActionRef.current.send({
      left: phoneStateRef.current.left,
      right: phoneStateRef.current.right,
      tilt: phoneStateRef.current.tilt, 
      taps: taps 
    }, { target: hostPeerIdRef.current });
  };

  // --- RENDER DESKTOP ---
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
        
        {isConnected && !isPlaying ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
             <p className="text-emerald-400 font-mono text-3xl animate-pulse">{status}</p>
          </div>
        ) : null}

        <div className="absolute top-8 left-8 text-white z-40">
          <p className="text-4xl font-black tracking-widest">{score}</p>
          <p className={`text-xl font-mono ${combo > 5 ? 'text-orange-400 animate-pulse' : 'text-slate-500'}`}>
            {combo} COMBO
          </p>
        </div>

        <div className="absolute w-[60vw] h-[60vw] rounded-full border-[4px] border-white/30 shadow-[0_0_50px_rgba(255,255,255,0.2),inset_0_0_50px_rgba(255,255,255,0.1)] pointer-events-none z-20" />

        {hits.map(hit => (
          <div 
            key={hit.id}
            className="absolute top-1/2 left-1/2 w-[8vw] h-[8vw] -mt-[4vw] -ml-[4vw] rounded-full border-yellow-300 z-50 pointer-events-none shadow-[0_0_30px_rgba(253,224,71,0.8)]"
            style={{
              '--angle': `${hit.angle}deg`,
              animation: `hitPing 0.3s ease-out forwards`,
            } as React.CSSProperties}
          />
        ))}

        {notes.filter(n => n.type === 'DOUBLE' && n.side === 'RIGHT').map(note => (
          <div 
            key={`line-${note.id}`}
            className="absolute top-1/2 left-1/2 w-[100vw] h-[4px] -mt-[2px] -ml-[50vw] bg-white/40 shadow-[0_0_20px_rgba(255,255,255,0.6)] z-10"
            style={{
              '--angle': `${note.angle}deg`,
              animation: `expandLine ${NOTE_TRAVEL_TIME}ms linear forwards`,
            } as React.CSSProperties}
          />
        ))}

        {notes.map(note => (
          <div 
            key={note.id}
            className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full shadow-[0_0_20px_currentColor] z-30"
            style={{
              color: note.side === 'LEFT' ? '#3b82f6' : '#ec4899',
              backgroundColor: 'currentColor',
              '--angle': `${note.angle}deg`, 
              animation: `flyOut ${NOTE_TRAVEL_TIME}ms linear forwards`,
              transformOrigin: '0 0',
            } as React.CSSProperties} 
          />
        ))}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flyOut {
            0% { transform: rotate(var(--angle)) translateX(0) scale(0.2); opacity: 0; }
            5% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(50vw) scale(1.5); opacity: 0; }
          }
          @keyframes expandLine {
            0% { transform: rotate(var(--angle)) scaleX(0); opacity: 0; }
            5% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: rotate(var(--angle)) scaleX(1); opacity: 0; }
          }
          @keyframes hitPing {
            0% { transform: rotate(var(--angle)) translateX(30vw) scale(0.5); opacity: 1; border-width: 10px; }
            100% { transform: rotate(var(--angle)) translateX(30vw) scale(1.5); opacity: 0; border-width: 0px; }
          }
        `}} />

        <div className="absolute w-[150vw] h-[150vw] rounded-full border-[4px] border-slate-800/80 flex overflow-hidden shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-10 pointer-events-none">
          <div className={`w-1/2 h-full transition-colors duration-75 ${playerState.left ? 'bg-blue-600/30 shadow-[0_0_150px_rgba(37,99,235,0.5)]' : 'bg-slate-900/10'}`} />
          <div className={`w-1/2 h-full transition-colors duration-75 ${playerState.right ? 'bg-pink-600/30 shadow-[0_0_150px_rgba(219,39,119,0.5)]' : 'bg-slate-900/10'}`} />
        </div>

        {/* ⚡ OPTIMIZATION: Removed the CSS transition. Raw decimal precision handles the smoothness natively now. */}
        <div 
          ref={steeringContainerRef}
          className="absolute w-full px-[20vw] flex justify-between items-center z-40 pointer-events-none"
        >
          <div className="absolute inset-x-0 h-[2px] bg-slate-800/40 -z-10 mx-[20vw]" />
          <div className={`w-0 h-0 border-y-[30px] border-y-transparent border-l-[60px] transition-all duration-75 ${playerState.left ? 'border-l-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,1)] scale-125' : 'border-l-slate-700'}`} />
          <div className={`w-0 h-0 border-y-[30px] border-y-transparent border-r-[60px] transition-all duration-75 ${playerState.right ? 'border-r-pink-500 drop-shadow-[0_0_40px_rgba(236,72,153,1)] scale-125' : 'border-r-slate-700'}`} />
        </div>
      </div>
    );
  }

  // --- RENDER PHONE ---
  if (role === 'phone') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-hidden touch-none select-none">
        <div className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] sm:w-[100vw] sm:h-[100vh] -translate-x-1/2 -translate-y-1/2 portrait:-rotate-90 landscape:rotate-0 flex">
          
          {!status.includes('Active') ? (
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