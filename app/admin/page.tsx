"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LeaderboardTeam {
    id: string;
    points: number;
    name: string;
    leader: {
        name: string | null;
        email: string;
        profileUrl: string | null;
    };
    members: {
        name: string | null;
        email: string;
        profileUrl: string | null;
    }[];
}

interface AppConfig {
    dynamicScoring: boolean;
    eventState: 'START' | 'PAUSE' | 'STOP';
    rateLimit: {
        maxAttempts: number;
        windowSeconds: number;
        cooldownSeconds: number;
    };
    publicChallenges: boolean;
    publicLeaderboard: boolean;
}

interface AdminStats {
    totalTeams: number;
    totalUsers: number;
    totalCorrectSolves: number;
    challengesSolved: number;
    totalChallenges: number;
    solveRate: number;
    mostSolvedChallenge: string;
}

export default function AdminDashboardPage() {
    const { token, dbUser, loading } = useAuth();
    const router = useRouter();

    // Data State
    const [leaderboard, setLeaderboard] = useState<LeaderboardTeam[]>([]);
    const [config, setConfig] = useState<AppConfig>({
        dynamicScoring: true,
        eventState: 'START',
        rateLimit: { maxAttempts: 3, windowSeconds: 30, cooldownSeconds: 60 },
        publicChallenges: true,
        publicLeaderboard: true
    });
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    // Fetch Data
    const fetchData = async () => {
        if (!token) return;
        try {
            // Fetch Leaderboard
            const resLeader = await fetch("/api/leaderboard", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resLeader.ok) {
                const data = await resLeader.json();
                setLeaderboard(data);
            }

            // Fetch Config
            const resConfig = await fetch("/api/admin/config", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resConfig.ok) {
                const data = await resConfig.json();
                setConfig(data);
            }

            // Fetch Stats
            const resStats = await fetch("/api/admin/stats", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resStats.ok) {
                const data = await resStats.json();
                setStats(data);
            }

        } catch (error) {
            console.error("Failed to fetch admin data", error);
        } finally {
            setLoadingData(false);
        }
    };

    // Redirect to home if not authenticated after loading
    useEffect(() => {
        if (!loading && !token) {
            router.push('/');
        }
    }, [loading, token, router]);

    useEffect(() => {
        fetchData();
        // Polling for live updates? 
        const interval = setInterval(fetchData, 30000); // 30s
        return () => clearInterval(interval);
    }, [token]);

    const handleConfigUpdate = async (update: Partial<AppConfig>) => {
        // Optimistic Update
        const oldConfig = { ...config };
        setConfig({ ...config, ...update });

        try {
            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(update)
            });

            if (!res.ok) {
                setConfig(oldConfig); // Revert
                alert("Failed to update config");
            }
        } catch (error) {
            console.error("Config update error", error);
            setConfig(oldConfig);
        }
    };



    // Show loading only if auth is still loading OR (we have a token but data is loading)
    if (loading || (token && loadingData && !stats)) return (
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-pixel">
            <div className="text-2xl animate-pulse">INITIATING COMMAND CENTER...</div>
        </div>
    );

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'CHALLENGE_CREATOR')) {
        return (
            <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8">
                <div className="bg-white border-4 border-red-600 p-8 shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] text-center max-w-md">
                    <h1 className="text-4xl font-pixel text-red-600 mb-4 uppercase">Access Denied</h1>
                    <p className="font-mono-retro text-zinc-600 mb-6 uppercase">Administrative Clearance Required. Unauthorized access attempt logged.</p>
                    <Link href="/" className="bg-black text-white px-6 py-2 font-pixel hover:bg-zinc-800 transition-colors uppercase">Return to Base</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-100 text-black p-4 md:p-8 relative selection:bg-purple-500 selection:text-white font-mono-retro overflow-x-hidden">
            {/* Background Grid & Scanline */}
            <div className="fixed inset-0 bg-[url('/grid.png')] opacity-[0.03] pointer-events-none"></div>
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-black/[0.02] to-transparent bg-[length:100%_4px] opacity-10"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <header className="mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end border-b-8 border-black pb-8 gap-8">
                    <div className="relative">
                        <div className="absolute -top-6 -left-2 bg-black text-white px-2 py-0.5 text-[10px] uppercase font-pixel tracking-tighter z-20">
                            Secure Network Alpha
                        </div>
                        <h1 className="text-6xl md:text-8xl font-pixel text-shadow-retro leading-none uppercase tracking-tighter">
                            Mission<br /><span className="text-purple-600">Control</span>
                        </h1>
                    </div>

                    <div className="w-full xl:w-auto">
                        <nav className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Link href="/admin/challenges" className="stats-link group">
                                <span className="stats-link-icon">⚔️</span>
                                <span className="stats-link-text">Challenges</span>
                            </Link>
                            {dbUser.role === 'ADMIN' && (
                                <Link href="/admin/users" className="stats-link group">
                                    <span className="stats-link-icon">👥</span>
                                    <span className="stats-link-text">Personnel</span>
                                </Link>
                            )}
                            {dbUser.role === 'ADMIN' && (
                                <Link href="/admin/announcements" className="stats-link group">
                                    <span className="stats-link-icon">📢</span>
                                    <span className="stats-link-text">Intel</span>
                                </Link>
                            )}
                            {dbUser.role === 'ADMIN' && (
                                <Link href="/admin/seed" className="stats-link group">
                                    <span className="stats-link-icon">💾</span>
                                    <span className="stats-link-text">Seeder</span>
                                </Link>
                            )}
                            {dbUser.role === 'ADMIN' && (
                                <Link href="/admin/maintenance" className="stats-link group bg-red-50 hover:bg-red-100 border-red-600 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                                    <span className="stats-link-icon">⚙️</span>
                                    <span className="stats-link-text text-red-600">Maintenance</span>
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Top Stats Banner */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="stats-card border-black">
                        <div className="stats-card-label">Registered Units</div>
                        <div className="stats-card-value">{stats?.totalTeams || 0} <span className="text-xl">Teams</span></div>
                        <div className="stats-card-sub">{stats?.totalUsers || 0} Individual Agents</div>
                        <div className="stats-card-bar bg-zinc-200"><div className="bg-black h-full" style={{ width: '100%' }}></div></div>
                    </div>

                    <div className="stats-card border-purple-600">
                        <div className="stats-card-label text-purple-600">Operations Progress</div>
                        <div className="stats-card-value text-purple-600">{stats?.solveRate || 0}%</div>
                        <div className="stats-card-sub">{stats?.challengesSolved || 0} / {stats?.totalChallenges || 0} Challenges Solved</div>
                        <div className="stats-card-bar bg-purple-100"><div className="bg-purple-600 h-full transition-all duration-1000" style={{ width: `${stats?.solveRate || 0}%` }}></div></div>
                    </div>

                    <div className="stats-card border-retro-green">
                        <div className="stats-card-label text-retro-green">Total Valid Solves</div>
                        <div className="stats-card-value text-retro-green">{stats?.totalCorrectSolves || 0}</div>
                        <div className="stats-card-sub">Correct Flag Submissions</div>
                        <div className="stats-card-bar bg-green-100"><div className="bg-retro-green h-full" style={{ width: '100%' }}></div></div>
                    </div>

                    <div className="stats-card border-yellow-500">
                        <div className="stats-card-label text-yellow-600">Hot Target</div>
                        <div className="stats-card-value text-yellow-600 text-2xl mt-2 line-clamp-1">{stats?.mostSolvedChallenge || "N/A"}</div>
                        <div className="stats-card-sub">Most Compromised Node</div>
                        <div className="stats-card-bar bg-yellow-100"><div className="bg-yellow-500 h-full" style={{ width: '100%' }}></div></div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT SIDE: Operations Control (Col 4) */}
                    <div className="lg:col-span-12 xl:col-span-4 space-y-8">

                        {dbUser.role === 'CHALLENGE_CREATOR' && (
                            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                                <div className="absolute -top-1 -right-1 bg-yellow-400 border-2 border-black px-2 py-0.5 text-[8px] font-pixel z-10 uppercase">
                                    Active Duty
                                </div>
                                <h2 className="text-3xl font-pixel mb-6 border-b-2 border-black pb-2">Creator Workspace</h2>
                                <div className="grid grid-cols-1 gap-4">
                                    <Link href="/admin/challenges/create" className="flex items-center justify-between p-4 bg-zinc-50 border-2 border-black hover:bg-retro-green transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-pixel text-sm uppercase">Deploy Challenge</span>
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Initialize new target node</span>
                                        </div>
                                        <span className="text-2xl group-hover:scale-125 transition-transform">⚔️</span>
                                    </Link>
                                    <Link href="/admin/themes" className="flex items-center justify-between p-4 bg-zinc-50 border-2 border-black hover:bg-purple-100 transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-pixel text-sm uppercase">Manage Themes</span>
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Classify operation sectors</span>
                                        </div>
                                        <span className="text-2xl group-hover:scale-125 transition-transform">📁</span>
                                    </Link>
                                    <Link href="/admin/challenges" className="flex items-center justify-between p-4 bg-zinc-50 border-2 border-black hover:bg-yellow-50 transition-colors group">
                                        <div className="flex flex-col">
                                            <span className="font-pixel text-sm uppercase">Inventory List</span>
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Review all active modules</span>
                                        </div>
                                        <span className="text-2xl group-hover:scale-125 transition-transform">📋</span>
                                    </Link>
                                </div>
                                <div className="mt-6 p-4 bg-zinc-900 text-retro-green border-2 border-black font-mono-retro text-[10px] leading-relaxed">
                                    <span className="text-white font-bold block mb-1 underline">CREATOR_PROTOCOL_v1.0</span>
                                    You have internal clearance to modify challenge assets. Please ensure all flags follow standard encryption formats.
                                </div>
                            </div>
                        )}

                        {dbUser.role === 'ADMIN' && (
                            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 border border-black ${config.eventState === 'START' ? 'animate-pulse bg-green-500' : 'bg-transparent'}`}></div>)}
                                </div>

                                <h2 className="text-3xl font-pixel mb-8 border-b-2 border-black pb-2 flex items-center gap-3">
                                    <span>EVENT SIGNAL</span>
                                    {config.eventState === 'START' && <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-ping"></div>}
                                </h2>

                                <div className="grid grid-cols-1 gap-4 font-pixel">
                                    <button
                                        onClick={() => handleConfigUpdate({ eventState: 'START' })}
                                        className={`control-btn ${config.eventState === 'START' ? 'bg-green-500 border-black shadow-[4px_4px_0px_0px_black]' : 'bg-zinc-100 text-zinc-400 border-zinc-300'}`}
                                    >
                                        <span className="flex items-center gap-4">
                                            <div className={`w-6 h-6 border-4 flex items-center justify-center ${config.eventState === 'START' ? 'border-black' : 'border-zinc-300'}`}>
                                                {config.eventState === 'START' && <div className="w-2 h-2 bg-black"></div>}
                                            </div>
                                            GO LIVE (START)
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleConfigUpdate({ eventState: 'PAUSE' })}
                                        className={`control-btn ${config.eventState === 'PAUSE' ? 'bg-yellow-400 border-black shadow-[4px_4px_0px_0px_black]' : 'bg-zinc-100 text-zinc-400 border-zinc-300'}`}
                                    >
                                        <span className="flex items-center gap-4">
                                            <div className={`w-6 h-6 border-4 flex items-center justify-center ${config.eventState === 'PAUSE' ? 'border-black' : 'border-zinc-300'}`}>
                                                {config.eventState === 'PAUSE' && <div className="w-2 h-2 bg-black"></div>}
                                            </div>
                                            HOLD FIRE (PAUSE)
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleConfigUpdate({ eventState: 'STOP' })}
                                        className={`control-btn ${config.eventState === 'STOP' ? 'bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_black]' : 'bg-zinc-100 text-zinc-400 border-zinc-300'}`}
                                    >
                                        <span className="flex items-center gap-4">
                                            <div className={`w-6 h-6 border-4 flex items-center justify-center ${config.eventState === 'STOP' ? 'border-white' : 'border-zinc-300'}`}>
                                                {config.eventState === 'STOP' && <div className="w-2 h-2 bg-white"></div>}
                                            </div>
                                            ABORT MISSION (STOP)
                                        </span>
                                    </button>
                                </div>

                                <div className={`mt-8 p-4 border-2 border-black font-mono-retro text-xs uppercase transition-colors ${config.eventState === 'START' ? 'bg-green-50 text-green-700' : config.eventState === 'PAUSE' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                    <div className="font-bold border-b border-black/10 mb-2 pb-1">Operational Protocol:</div>
                                    {config.eventState === 'START' && "Full access enabled. Global submission window open. Monitoring live solves."}
                                    {config.eventState === 'PAUSE' && "Submissions suspended. Database locked for writes. Challenges remain viewable."}
                                    {config.eventState === 'STOP' && "Cease operations. All challenge modules decompiled. Finalizing leaderboard."}
                                </div>
                            </div>
                        )}

                        {dbUser.role === 'ADMIN' && (
                            <>
                                {/* CONFIG GROUP: SCORING & VISIBILITY */}
                                <div className="bg-zinc-900 text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                    <h2 className="text-2xl font-pixel mb-6 border-b border-white/20 pb-2 text-purple-400 uppercase">Core Logic</h2>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-lg uppercase tracking-tight">Dynamic Scoring</span>
                                                <span className="text-[10px] text-zinc-500 font-mono italic max-w-[200px]">Challenges lose value as solve count rises.</span>
                                            </div>
                                            <Toggle
                                                enabled={config.dynamicScoring}
                                                onClick={() => handleConfigUpdate({ dynamicScoring: !config.dynamicScoring })}
                                                activeColor="bg-purple-600"
                                            />
                                        </div>

                                        <div className="h-px bg-white/10 w-full"></div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-lg uppercase tracking-tight">Public Challenges</span>
                                                <span className="text-[10px] text-zinc-500 font-mono italic">Allow guests to view the challenge list.</span>
                                            </div>
                                            <Toggle
                                                enabled={config.publicChallenges}
                                                onClick={() => handleConfigUpdate({ publicChallenges: !config.publicChallenges })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-lg uppercase tracking-tight">Public Scoreboard</span>
                                                <span className="text-[10px] text-zinc-500 font-mono italic">Allow anyone to view team rankings.</span>
                                            </div>
                                            <Toggle
                                                enabled={config.publicLeaderboard}
                                                onClick={() => handleConfigUpdate({ publicLeaderboard: !config.publicLeaderboard })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT SIDE: Intelligence Hub (Col 8) */}
                    <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-8">

                        {/* LEADERBOARD DATA */}
                        <div className="bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex-grow">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-black pb-4 gap-4">
                                <div>
                                    <h2 className="text-4xl font-pixel uppercase tracking-tighter">Live Intelligence</h2>
                                    <div className="text-[10px] bg-black text-white px-2 py-0.5 inline-block uppercase mt-1">Real-time Ranking Engine</div>
                                </div>
                                <div className="flex gap-4">
                                    <Link href="/leaderboard" className="bg-zinc-100 border-2 border-black p-2 hover:bg-zinc-200 transition-all font-pixel text-[10px] uppercase">
                                        Monitor Public
                                    </Link>
                                    <button onClick={fetchData} className="bg-black text-white p-2 hover:bg-zinc-800 transition-all font-pixel text-[10px] uppercase">
                                        Refresh Data
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse font-mono-retro">
                                    <thead className="border-b-4 border-black">
                                        <tr>
                                            <th className="p-4 font-pixel text-xs uppercase text-zinc-400">Pos</th>
                                            <th className="p-4 font-pixel text-xs uppercase text-black">Unit Identity</th>
                                            <th className="p-4 font-pixel text-xs uppercase text-black text-right">Value (PTS)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-zinc-100">
                                        {leaderboard.map((team, index) => (
                                            <tr key={team.id} className="group hover:bg-purple-50 transition-colors">
                                                <td className="p-4">
                                                    <div className={`w-8 h-8 flex items-center justify-center font-pixel text-lg ${index === 0 ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_black]' : 'text-zinc-400'}`}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            {team.leader?.profileUrl ? (
                                                                <img src={team.leader.profileUrl} className="w-10 h-10 border-2 border-black" alt="" />
                                                            ) : (
                                                                <div className="w-10 h-10 border-2 border-black bg-zinc-200 flex items-center justify-center text-[10px] uppercase">?</div>
                                                            )}
                                                            {index === 0 && <span className="absolute -top-2 -left-2 text-xl">👑</span>}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xl uppercase tracking-tighter group-hover:text-purple-600 transition-colors leading-tight">
                                                                {team.name}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 uppercase">
                                                                Lead: {team.leader?.name || 'Unknown'} • {team.members?.length || 0} Units
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="text-3xl font-pixel text-purple-700 tracking-tighter tabular-nums drop-shadow-sm">
                                                        {team.points.toLocaleString()}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {leaderboard.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-20 text-center text-zinc-400 font-pixel text-3xl opacity-20 uppercase">No Data Transmission</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RATE LIMIT SETTINGS */}
                        {dbUser.role === 'ADMIN' && (
                            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3 border-b-2 border-black pb-2 mb-2 flex justify-between items-center">
                                    <h2 className="text-xl font-pixel uppercase tracking-tight">Security Protocols (Rate Limits)</h2>
                                    <span className="text-[10px] font-mono italic text-zinc-500">Global Anti-Brute Mitigation</span>
                                </div>

                                {[
                                    { label: 'Max Attempts', key: 'maxAttempts', helper: 'X Allowed Submissions' },
                                    { label: 'Window Window', key: 'windowSeconds', helper: 'Time in Seconds' },
                                    { label: 'Cooldown', key: 'cooldownSeconds', helper: 'Wait Penalty' }
                                ].map(field => (
                                    <div key={field.key} className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{field.label}</label>
                                        <input
                                            type="number"
                                            value={config.rateLimit[field.key as keyof typeof config.rateLimit]}
                                            onChange={(e) => handleConfigUpdate({ rateLimit: { ...config.rateLimit, [field.key]: parseInt(e.target.value) || 0 } })}
                                            className="border-2 border-black p-2 font-pixel text-lg focus:bg-yellow-50 outline-none transition-colors"
                                        />
                                        <span className="text-[10px] font-mono text-zinc-400 italic">{field.helper}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Styles */}
            <style jsx>{`
                .stats-link {
                    @apply bg-white border-4 border-black p-3 flex items-center gap-3 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                           hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-50;
                }
                .stats-link-icon { @apply text-2xl; }
                .stats-link-text { @apply font-pixel text-[10px] uppercase tracking-tighter leading-none; }

                .stats-card {
                    @apply bg-white border-t-8 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col;
                }
                .stats-card-label { @apply text-[10px] font-pixel uppercase tracking-tighter mb-1; }
                .stats-card-value { @apply text-4xl font-pixel tracking-tighter; }
                .stats-card-sub { @apply text-[10px] font-mono uppercase text-zinc-400 mt-1; }
                .stats-card-bar { @apply h-1 w-full mt-4 overflow-hidden; }

                .control-btn {
                    @apply p-6 border-4 font-bold text-2xl transition-all flex items-center justify-between text-left;
                }
            `}</style>
        </div>
    );
}

function Toggle({ enabled, onClick, activeColor = "bg-retro-green" }: { enabled: boolean, onClick: () => void, activeColor?: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-14 h-7 border-4 border-black relative transition-colors ${enabled ? activeColor : 'bg-zinc-700'}`}
        >
            <div className={`absolute top-0 bottom-0 w-5 bg-white border-black transition-transform ${enabled ? 'translate-x-full border-l-4' : 'translate-x-0 border-r-4'}`}></div>
        </button>
    );
}
