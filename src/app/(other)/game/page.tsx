'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const BASE_NOTE_TRAVEL_TIME = 2000; 
const BASE_HIT_WINDOW_START = 900; 
const BASE_HIT_WINDOW_END = 1500; 
const HIT_TOLERANCE_DEG = 45; 
const NETWORK_THROTTLE_MS = 16; 

type Note = { 
  id: string; 
  side: 'LEFT' | 'RIGHT'; 
  angle: number; 
  createdAt: number; 
  type: 'SINGLE' | 'DOUBLE'; 
  missed?: boolean; 
  travelTime: number; 
  hitStart: number; 
  hitEnd: number; 
};
type HitFeedback = { id: string; angle: number; };

function DualScreenGame() {
  const searchParams = useSearchParams();
  const urlRoom = searchParams.get('room');
  const isDevMode = searchParams.get('dev') === 'true'; 
  const isAutoMode = searchParams.get('auto') === 'true';
  
  const [role, setRole] = useState<'loading' | 'desktop' | 'phone'>(isDevMode || isAutoMode ? 'desktop' : 'loading');
  const [status, setStatus] = useState(isAutoMode ? 'AUTOPILOT ENGAGED 🚀' : (isDevMode ? 'デベロッパーモード 🔥' : '初期化中 ⏳'));
  const [qrUrl, setQrUrl] = useState('');
  
  const [isConnected, setIsConnected] = useState(isDevMode || isAutoMode);
  const [isPlaying, setIsPlaying] = useState(isDevMode || isAutoMode);
  
  const [playerState, setPlayerState] = useState({ left: false, right: false });
  const [notes, setNotes] = useState<Note[]>([]);
  const [hits, setHits] = useState<HitFeedback[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  const steeringContainerRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<Note[]>([]);
  const speedMultiplierRef = useRef(1.0);
  
  const sendActionRef = useRef<any>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const activePlayerIdRef = useRef<string | null>(null);
  const prevAngleRef = useRef({ LEFT: 180, RIGHT: 0 }); 
  
  // Autopilot Smoothing Refs
  const targetTiltRef = useRef(0);
  const currentTiltRef = useRef(0);
  
  const phoneStateRef = useRef({ left: false, right: false, tilt: 0 });
  const lastSendTimeRef = useRef(0);
  const lastSentTiltRef = useRef(0);
  const sensorsStartedRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // --- Speed Escalation Engine ---
  useEffect(() => {
    if (!isPlaying || role !== 'desktop') return;
    
    const speedScaler = setInterval(() => {
      speedMultiplierRef.current *= 1.005;
    }, 1000);

    return () => clearInterval(speedScaler);
  }, [isPlaying, role]);

  // --- Auto-Pilot AI Engine (Smooth) ---
  useEffect(() => {
    if (!isAutoMode || role !== 'desktop' || !isPlaying) return;

    let animationFrameId: number;
    
    // Smooth rendering loop
    const renderLoop = () => {
      currentTiltRef.current += (targetTiltRef.current - currentTiltRef.current) * 0.15;
      
      if (steeringContainerRef.current) {
        steeringContainerRef.current.style.transform = `rotate(${currentTiltRef.current}deg)`;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // AI decision loop
    const autopilotEngine = setInterval(() => {
      const now = Date.now();
      
      const pendingHits = notesRef.current.filter(n => {
        if (n.missed) return false;
        const age = now - n.createdAt;
        // Adjust targeting dynamically based on the note's specific speed requirements
        const optimalHitTime = n.hitStart + ((n.hitEnd - n.hitStart) * 0.25) + (Math.random() * 20 - 10); 
        return age >= optimalHitTime && age <= optimalHitTime + 60;
      });

      // Look ahead for steering even before hitting, to allow smooth panning
      const upcomingNotes = notesRef.current.filter(n => !n.missed).sort((a, b) => a.createdAt - b.createdAt);
      if (upcomingNotes.length > 0) {
        const baseNote = upcomingNotes[0];
        const angleDrift = Math.random() * 4 - 2; 
        targetTiltRef.current = (baseNote.side === 'RIGHT' ? baseNote.angle : baseNote.angle - 180) + angleDrift;
      } else {
        targetTiltRef.current = 0; 
      }

      if (pendingHits.length > 0) {
        const activeTaps = pendingHits.map(n => n.side);

        setPlayerState({ 
          left: activeTaps.includes('LEFT'), 
          right: activeTaps.includes('RIGHT') 
        });

        setTimeout(() => {
          setPlayerState({ left: false, right: false });
        }, 60);

        handleTaps(activeTaps, currentTiltRef.current);
      }
    }, 30);

    return () => {
      clearInterval(autopilotEngine);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoMode, role, isPlaying]);

  // --- Desktop Game Loop ---
  useEffect(() => {
    if (role !== 'desktop' || !isConnected || !isPlaying) return;

    let spawnerTimeout: NodeJS.Timeout;

    const spawnNote = () => {
      const roll = Math.random();
      const now = Date.now();
      const speed = speedMultiplierRef.current;
      const newNotes: Note[] = [];

      const currentTravelTime = BASE_NOTE_TRAVEL_TIME / speed;
      const currentHitStart = BASE_HIT_WINDOW_START / speed;
      const currentHitEnd = BASE_HIT_WINDOW_END / speed;

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
        newNotes.push({ id: `R-${now}`, side: 'RIGHT', angle: rightAngle, createdAt: now, type: 'DOUBLE', travelTime: currentTravelTime, hitStart: currentHitStart, hitEnd: currentHitEnd });
        newNotes.push({ id: `L-${now}`, side: 'LEFT', angle: rightAngle + 180, createdAt: now, type: 'DOUBLE', travelTime: currentTravelTime, hitStart: currentHitStart, hitEnd: currentHitEnd });
      } else if (roll < 0.75) {
        const side = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
        newNotes.push({ id: `${side[0]}-${now}`, side, angle: getNextAngle(side), createdAt: now, type: 'SINGLE', travelTime: currentTravelTime, hitStart: currentHitStart, hitEnd: currentHitEnd });
      }

      if (newNotes.length > 0) setNotes(prev => [...prev, ...newNotes]);

      const nextSpawnInterval = 1000 / speedMultiplierRef.current;
      spawnerTimeout = setTimeout(spawnNote, nextSpawnInterval);
    };

    spawnerTimeout = setTimeout(spawnNote, 1000);

    const cleanup = setInterval(() => {
      const now = Date.now();
      setNotes(prev => {
        let dropped = false;
        const next = prev.map(n => {
          if (!n.missed && now - n.createdAt > n.hitEnd) {
            dropped = true;
            return { ...n, missed: true };
          }
          return n;
        }).filter(n => now - n.createdAt < n.travelTime + 200); 
        
        if (dropped) setTimeout(() => setCombo(0), 0);
        return next;
      });
    }, 100);

    return () => { clearTimeout(spawnerTimeout); clearInterval(cleanup); };
  }, [role, isConnected, isPlaying]);

  // --- Network Initialization ---
  useEffect(() => {
    if (isDevMode || isAutoMode) return; 

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
        setStatus('コントローラーの接続を待機中 🎧');

        currentRoom.onPeerJoin = (peerId: string) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setStatus('コントローラーが接続されました。開始を待っています 💿');
            setIsConnected(true);
          }
        };

        currentRoom.onPeerLeave = (peerId: string) => {
          if (activePlayerIdRef.current === peerId) {
            activePlayerIdRef.current = null;
            setIsConnected(false);
            setIsPlaying(false);
            setStatus('信号が途絶えました。再スキャンして接続してください 📡');
            setPlayerState({ left: false, right: false });
            setNotes([]);
            speedMultiplierRef.current = 1.0; 
          }
        };

        controllerAction.onMessage = (payload: any, { peerId }: any) => {
          if (!activePlayerIdRef.current) {
            activePlayerIdRef.current = peerId;
            setIsConnected(true);
          }
          if (peerId !== activePlayerIdRef.current) return;
          
          if (payload.action === 'START') {
            setStatus('ゲームスタート 🔥');
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
        setStatus('画面にペアリング中 🔗');
        sendActionRef.current = controllerAction; 
        
        currentRoom.onPeerJoin = (peerId: string) => {
          hostPeerIdRef.current = peerId;
          setStatus('準備完了 🔥');
        };
      }
    };

    initializeTrystero();
    return () => { if (currentRoom) currentRoom.leave(); };
  }, [urlRoom, isDevMode, isAutoMode]);

  const handleTaps = (taps: string[], currentTilt: number) => {
    const now = Date.now();
    setNotes(prevNotes => {
      let notesToKeep = [...prevNotes];
      let hitRegistered = false;
      const newHits: HitFeedback[] = [];

      taps.forEach(tapSide => {
        const targetNoteIndex = notesToKeep.findIndex(n => {
          const age = now - n.createdAt;
          return n.side === tapSide && !n.missed && age >= n.hitStart && age <= n.hitEnd;
        });

        if (targetNoteIndex !== -1) {
          const note = notesToKeep[targetNoteIndex];
          const expectedAngle = note.side === 'LEFT' ? currentTilt + 180 : currentTilt;
          const angleDiff = Math.abs(((note.angle - expectedAngle + 540) % 360) - 180);

          if (angleDiff <= HIT_TOLERANCE_DEG) {
            notesToKeep.splice(targetNoteIndex, 1);
            hitRegistered = true;
            
            const speedBonus = Math.floor((speedMultiplierRef.current - 1) * 500);
            setScore(s => s + 100 + speedBonus);
            
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

  const requestSensors = async () => {
    if (sensorsStartedRef.current) return;

    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      const screenOrientation = window.screen?.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        await screenOrientation.lock('landscape');
      }
    } catch (e) { console.warn('ネイティブ画面方向ロックがスキップされました', e); }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return alert('プレイするにはモーションセンサーへのアクセス許可が必要です 🛑');
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
    
    setStatus('センサー有効 🟢');
  };

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

  if (role === 'desktop') {
    return (
      <div className="fixed inset-0 bg-[#020617] overflow-hidden flex items-center justify-center font-sans tracking-tight text-white">
        
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

        {(!isConnected || qrUrl) && !isConnected ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <p className="text-[#00f3ff] mb-8 font-mono text-2xl uppercase tracking-widest border-b-2 border-[#00f3ff] pb-2">{status}</p>
            <div className="bg-white p-6 rounded-none border-4 border-[#00f3ff] relative">
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-4 border-l-4 border-white" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-4 border-r-4 border-white" />
              <QRCodeSVG value={qrUrl} size={300} />
            </div>
          </div>
        ) : null}
        
        {isConnected && !isPlaying ? (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
             <p className="text-[#ff00ea] font-mono text-3xl uppercase tracking-widest border-y-2 border-[#ff00ea] py-4 px-8">{status}</p>
          </div>
        ) : null}

        <div className="absolute top-8 left-8 text-white z-40 flex flex-col gap-1">
          <p className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500 drop-shadow-md">
            {score.toString().padStart(6, '0')}
          </p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-1 bg-slate-700" />
            <p className={`text-2xl font-mono font-bold uppercase tracking-widest transition-colors duration-100 ${combo > 5 ? 'text-[#00f3ff]' : 'text-slate-500'}`}>
              x{combo} Combo
            </p>
          </div>
        </div>

        <div className="absolute w-[60vw] h-[60vw] rounded-full border-[2px] border-dashed border-white/20 pointer-events-none z-20 flex items-center justify-center">
            <div className="w-full h-full rounded-full border-[1px] border-white/5 scale-[1.05]" />
            <div className="absolute w-full h-full rounded-full border-[1px] border-white/5 scale-[0.95]" />
        </div>

        {hits.map(hit => (
          <div 
            key={hit.id}
            className="absolute top-1/2 left-1/2 w-[8vw] h-[8vw] -mt-[4vw] -ml-[4vw] rounded-full z-50 pointer-events-none"
            style={{
              '--angle': `${hit.angle}deg`,
              borderColor: hit.angle > 90 && hit.angle < 270 ? '#00f3ff' : '#ff00ea',
              animation: `hitPingCrisp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            } as React.CSSProperties}
          />
        ))}

        {notes.filter(n => n.type === 'DOUBLE' && n.side === 'RIGHT').map(note => (
          <div 
            key={`line-${note.id}`}
            className="absolute top-1/2 left-1/2 w-[100vw] h-[2px] -mt-[1px] -ml-[50vw] bg-transparent border-t-[2px] border-dashed border-white/40 z-10"
            style={{
              '--angle': `${note.angle}deg`,
              animation: `expandLine ${note.travelTime}ms linear forwards`,
            } as React.CSSProperties}
          />
        ))}

        {notes.map(note => (
          <div 
            key={note.id}
            className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 z-30 flex items-center justify-center"
            style={{
              color: note.side === 'LEFT' ? '#00f3ff' : '#ff00ea',
              '--angle': `${note.angle}deg`, 
              animation: `flyOut ${note.travelTime}ms linear forwards`,
              transformOrigin: '50% 50%',
            } as React.CSSProperties} 
          >
             <div className="w-full h-full border-[3px] border-current bg-[#020617] rotate-45 transition-all" />
          </div>
        ))}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flyOut {
            0% { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 0; }
            5% { opacity: 1; scale: 0.5; }
            80% { opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(50vw) scale(1.2); opacity: 0; }
          }
          @keyframes expandLine {
            0% { transform: rotate(var(--angle)) scaleX(0); opacity: 0; }
            5% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: rotate(var(--angle)) scaleX(1); opacity: 0; }
          }
          @keyframes hitPingCrisp {
            0% { transform: rotate(var(--angle)) translateX(30vw) scale(0.6); opacity: 1; border-width: 8px; border-style: solid; }
            100% { transform: rotate(var(--angle)) translateX(30vw) scale(2); opacity: 0; border-width: 1px; border-style: solid; }
          }
        `}} />

        <div className="absolute w-16 h-16 bg-[#020617] border-[4px] border-slate-800 rounded-full z-10 flex items-center justify-center shadow-2xl pointer-events-none">
            <div className="w-4 h-4 bg-white/20 rounded-full" />
        </div>

        <div 
          ref={steeringContainerRef}
          className="absolute w-full px-[20vw] flex justify-between items-center z-40 pointer-events-none"
        >
          <div className="absolute inset-x-0 h-[1px] bg-white/10 -z-10 mx-[20vw]" />
          
          <div className={`relative flex items-center justify-center w-12 h-24 border-r-4 transition-all duration-75 ${playerState.left ? 'border-[#00f3ff] bg-[#00f3ff]/10 scale-110 translate-x-4' : 'border-slate-700 bg-slate-900/50'}`}>
             <div className={`absolute left-0 w-full h-[2px] transition-colors ${playerState.left ? 'bg-[#00f3ff]' : 'bg-slate-700'}`} />
          </div>

          <div className={`relative flex items-center justify-center w-12 h-24 border-l-4 transition-all duration-75 ${playerState.right ? 'border-[#ff00ea] bg-[#ff00ea]/10 scale-110 -translate-x-4' : 'border-slate-700 bg-slate-900/50'}`}>
             <div className={`absolute right-0 w-full h-[2px] transition-colors ${playerState.right ? 'bg-[#ff00ea]' : 'bg-slate-700'}`} />
          </div>
        </div>
      </div>
    );
  }

  if (role === 'phone') {
    return (
      <div className="fixed inset-0 bg-[#020617] overflow-hidden touch-none select-none font-sans uppercase tracking-widest text-white font-bold">
        <div className="absolute top-1/2 left-1/2 w-[100vh] h-[100vw] sm:w-[100vw] sm:h-[100vh] -translate-x-1/2 -translate-y-1/2 portrait:-rotate-90 landscape:rotate-0 flex p-4 gap-4 box-border">
          
          {!status.includes('有効') ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-slate-950/95 portrait:rotate-90 landscape:rotate-0 backdrop-blur-sm">
              <p className="text-[#00f3ff] mb-12 font-mono text-xl text-center border-b-2 border-[#00f3ff] pb-2">{status}</p>
              {status.includes('準備完了') && (
                <button 
                  onClick={requestSensors} 
                  className="px-10 py-5 bg-transparent border-2 border-[#00f3ff] text-[#00f3ff] active:bg-[#00f3ff] active:text-[#020617] font-bold rounded-none text-xl transition-colors"
                >
                  START ENGINE
                </button>
              )}
            </div>
          ) : null}

          <div 
            onPointerDown={() => handlePointer('LEFT', 'DOWN')}
            onPointerUp={() => handlePointer('LEFT', 'UP')}
            onPointerCancel={() => handlePointer('LEFT', 'UP')}
            className="relative flex-1 h-full rounded-2xl border-2 overflow-hidden transition-colors duration-75 border-slate-800 bg-slate-900/50 active:border-[#00f3ff] active:bg-[#00f3ff]/20"
          >
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <span className="text-6xl text-[#00f3ff]">&lt;</span>
             </div>
          </div>

          <div 
            onPointerDown={() => handlePointer('RIGHT', 'DOWN')}
            onPointerUp={() => handlePointer('RIGHT', 'UP')}
            onPointerCancel={() => handlePointer('RIGHT', 'UP')}
            className="relative flex-1 h-full rounded-2xl border-2 overflow-hidden transition-colors duration-75 border-slate-800 bg-slate-900/50 active:border-[#ff00ea] active:bg-[#ff00ea]/20"
          >
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <span className="text-6xl text-[#ff00ea]">&gt;</span>
             </div>
          </div>
          
        </div>
      </div>
    );
  }

  return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-white font-mono tracking-widest uppercase">Initializing...</div>;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <DualScreenGame />
    </Suspense>
  );
}