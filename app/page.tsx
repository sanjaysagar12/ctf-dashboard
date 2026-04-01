"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading, signInWithGoogle, error, setError } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"HOME" | "REGISTER" | "JOIN">("HOME");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [status, setStatus] = useState<{
    eventState: 'START' | 'PAUSE' | 'STOP';
    publicChallenges: boolean;
    publicLeaderboard: boolean;
  }>({
    eventState: 'START',
    publicChallenges: true,
    publicLeaderboard: true
  });

  // Current Date/Time for HUD
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    setDateTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }).replace(',', ''));
    const interval = setInterval(() => {
      setDateTime(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }).replace(',', ''));
    }, 1000);

    // Fetch Status for Visibility
    fetch("/api/status")
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error("Failed to fetch status", err));

    return () => clearInterval(interval);
  }, []);


  const isClosed = status.eventState === 'STOP';

  useEffect(() => {
    if (!loading && user && !isClosed) {
      router.push("/challenges");
    }
  }, [user, loading, router, isClosed]);

  const handleRegister = async () => {
    if (!teamName) return;
    await signInWithGoogle({ mode: 'REGISTER', teamName });
  };

  const handleJoin = async () => {
    if (!teamCode || teamCode.length !== 4) return;
    await signInWithGoogle({ mode: 'JOIN', teamCode });
  };


  if (loading) {
    return <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-pixel text-xl animate-pulse">BOOTING SYSTEM...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-black font-mono-retro overflow-hidden relative selection:bg-retro-green selection:text-black">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('/grid.png')] opacity-10 pointer-events-none fixed"></div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <span className="font-pixel text-sm text-zinc-400">{'>'} Greetings</span>
          <span className="font-pixel text-sm text-zinc-400">{'>'} -</span>
          <span className="font-pixel text-sm text-zinc-400 animate-pulse">{'>'} INITIALIZING SEQUENCE...</span>
        </div>
      </div>


      {/* Main Center Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center z-20">

        {mode === 'HOME' && (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            {/* Logo */}
            <div className="mb-4 inline-block relative">
              <NextImage
                src="/logo.png"
                alt="CTF Logo"
                width={120}
                height={120}
                className="pixelated"
                priority
              />
            </div>

            <h1 className="text-6xl md:text-8xl font-pixel mb-12 tracking-tighter">
              Capture<br />The Flag
            </h1>

            {isClosed ? (
              /* Event is STOP — show only view buttons */
              <div className="flex flex-col items-center gap-6">
                <div className="flex border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  {status.publicChallenges && (
                    <Link
                      href="/challenges"
                      className="px-8 py-4 border-r-2 border-black font-mono font-bold hover:bg-zinc-100 hover:text-purple-600 transition-colors text-lg"
                    >
                      View<br />Challenges
                    </Link>
                  )}
                  {status.publicLeaderboard && (
                    <Link
                      href="/leaderboard"
                      className="px-8 py-4 font-mono font-bold hover:bg-zinc-100 hover:text-purple-600 transition-colors text-lg"
                    >
                      View<br />Scoreboard
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* Event is START or PAUSE — show full button bar */
              <div className="flex border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => setMode('REGISTER')}
                  className="px-8 py-4 border-r-2 border-black font-mono font-bold hover:bg-zinc-100 hover:text-retro-green transition-colors text-lg"
                >
                  Register<br />Team
                </button>
                <button
                  onClick={() => setMode('JOIN')}
                  className="px-8 py-4 border-r-2 border-black font-mono font-bold hover:bg-zinc-100 hover:text-retro-green transition-colors text-lg"
                >
                  Join<br />Team
                </button>
                <button
                  onClick={() => signInWithGoogle()} // Regular login if already registered
                  className="px-8 py-4 border-r-2 border-black font-mono font-bold hover:bg-zinc-100 hover:text-retro-green transition-colors flex items-center gap-2 text-lg"
                >
                  Login
                </button>
                <div className="flex flex-col">
                  {status.publicChallenges && (
                    <Link
                      href="/challenges"
                      className="px-6 py-2 border-b border-black font-mono font-bold hover:bg-zinc-100 hover:text-purple-600 transition-colors text-sm text-center"
                    >
                      View Challenges
                    </Link>
                  )}
                  {status.publicLeaderboard && (
                    <Link
                      href="/leaderboard"
                      className="px-6 py-2 font-mono font-bold hover:bg-zinc-100 hover:text-purple-600 transition-colors text-sm text-center"
                    >
                      Scoreboard
                    </Link>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 p-4 bg-red-100 border-2 border-red-500 text-red-800 font-bold max-w-md mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                ! ERROR: {error}
              </div>
            )}
          </div>
        )}

        {!isClosed && mode === 'REGISTER' && (
          <div className="w-full max-w-md bg-white border-2 border-black p-1 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="border border-zinc-300 p-8 relative">
              {/* Window Controls */}
              <div className="absolute top-0 right-0 p-2 flex border-b border-l border-zinc-300">
                <button onClick={() => { setMode('HOME'); setError(null); }} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 font-bold">✕</button>
              </div>

              <h2 className="text-3xl font-pixel mb-8">Register Team</h2>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold uppercase mb-2 block text-zinc-500">{'>'} ENTER TEAM NAME:</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-zinc-100 border-b-2 border-black p-3 font-mono text-xl focus:outline-none focus:bg-zinc-50"
                    placeholder="Type here..."
                    autoFocus
                  />
                </div>

                <div className="text-xs text-zinc-500 space-y-2">
                  <p>By creating a team you agree to follow the <a href="https://www.CCEE.io/event/2530" className="underline text-blue-600">rules of the CCEE CTF</a>.</p>
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input type="checkbox" className="w-4 h-4 border-2 border-black rounded-none" />
                    <span>i won't be of any trouble</span>
                  </label>
                </div>

                <div className="text-xs text-zinc-400 italic">
                  Note: You can only create <span className="font-bold text-black border-b border-black">one team</span> per account.
                </div>

                <div className="pt-8 flex justify-end">
                  <button
                    onClick={handleRegister}
                    disabled={!teamName}
                    className="bg-white border-2 border-black px-6 py-2 uppercase font-mono text-zinc-400 hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0"
                  >
                    CREATE TEAM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isClosed && mode === 'JOIN' && (
          <div className="w-full max-w-md bg-white border-2 border-black p-1 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="border border-zinc-300 p-8 relative">
              {/* Window Controls */}
              <div className="absolute top-0 right-0 p-2 flex border-b border-l border-zinc-300">
                <button onClick={() => { setMode('HOME'); setError(null); }} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 font-bold">✕</button>
              </div>

              <h2 className="text-3xl font-pixel mb-8">Join Team</h2>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold uppercase mb-2 block text-zinc-500">{'>'} ENTER TEAM ACCESS KEY:</label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    maxLength={4}
                    className="w-full bg-zinc-100 border-b-2 border-black p-3 font-mono text-xl focus:outline-none focus:bg-zinc-50 tracking-widest text-center"
                    placeholder="____"
                    autoFocus
                  />
                </div>

                <div className="text-xs text-zinc-500">
                  <p>By joining a team you agree to follow the <a href="#" className="underline text-blue-600">rules of the CCEE CTF</a>.</p>
                </div>

                <div className="pt-8 flex justify-between items-center">
                  <button className="text-xs uppercase text-zinc-400 hover:text-black hover:underline">{'>'} RECOVER KEY</button>

                  <button
                    onClick={handleJoin}
                    disabled={teamCode.length !== 4}
                    className="bg-white border-2 border-black px-6 py-2 uppercase font-mono text-zinc-400 hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0"
                  >
                    JOIN TEAM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
