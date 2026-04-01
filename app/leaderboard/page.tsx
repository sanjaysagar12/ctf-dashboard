"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface Member {
    id: string; // Added id
    name: string | null;
    email: string;
    points: number;
    profileUrl: string | null;
}

interface HistoryPoint {
    time: string;
    score: number;
}

interface Team {
    id: string;
    name: string;
    points: number;
    leader: {
        name: string | null;
        email: string;
        profileUrl: string | null;
    };
    members: Member[];
    history: HistoryPoint[];
    categoryStats?: Record<string, number>;
}

const COLORS = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#3b82f6', // blue
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#8b5cf6', // violet
    '#84cc16', // lime
];

import RetroLayout from "@/components/RetroLayout";
import { useAuth } from "@/context/AuthContext";

export default function LeaderboardPage() {
    const { token, loading: authLoading } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleTeamIds, setVisibleTeamIds] = useState<string[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    const [accessDenied, setAccessDenied] = useState(false);

    // Initial fetch
    const fetchLeaderboard = async () => {
        try {
            const endpoint = token ? "/api/leaderboard" : "/api/leaderboard/public";
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(endpoint, { headers });
            if (res.ok) {
                const data = await res.json();
                setTeams(data);
                setAccessDenied(false);
                if (visibleTeamIds.length === 0 && data.length > 0) {
                    setVisibleTeamIds(data.slice(0, 5).map((t: Team) => t.id));
                }
                if (!selectedTeamId && data.length > 0) {
                    setSelectedTeamId(data[0].id);
                }
            } else if (res.status === 403) {
                setAccessDenied(true);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchLeaderboard();
            // Polling for live updates
            const interval = setInterval(fetchLeaderboard, 30000); // 30s
            return () => clearInterval(interval);
        }
    }, [token, authLoading]);



    if (loading) {
        return <div className="min-h-screen bg-retro-bg flex items-center justify-center font-pixel text-xl">LOADING...</div>;
    }

    if (accessDenied) {
        return (
            <div className="flex min-h-screen flex-col bg-retro-bg text-black font-mono-retro">
                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                    <h1 className="text-4xl font-pixel text-red-600">ACCESS DENIED</h1>
                    <p className="text-xl">Public visibility is currently disabled for this sector.</p>
                    <button onClick={() => window.location.href = '/'} className="mt-4 px-6 py-2 border-2 border-black bg-white hover:bg-zinc-100 font-pixel">BACK TO BASE</button>
                </div>
            </div>
        );
    }

    const handleTeamClick = (teamId: string) => {
        setSelectedTeamId(teamId);
        // Add to graph if not visible
        if (!visibleTeamIds.includes(teamId)) {
            setVisibleTeamIds(prev => [...prev, teamId]);
        }
    };

    const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

    // Prepare Category Data for the selected team
    const categoryData = selectedTeam?.categoryStats
        ? Object.entries(selectedTeam.categoryStats).map(([name, count]) => ({ name, count }))
        : [];

    if (loading) {
        return <div className="min-h-screen bg-zinc-100 flex items-center justify-center font-pixel text-xl animate-pulse">LOADING LEADERBOARD...</div>;
    }

    return (
        <RetroLayout title="Scoreboard" activePage="leaderboard">
            <div className="flex-1 h-full overflow-hidden p-3 md:p-6 lg:p-8 relative">
                <div className="max-w-7xl mx-auto h-full flex flex-col xl:flex-row gap-6">

                    {/* LEFT COLUMN: Leaderboard Table */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-0 border-b-2 border-black bg-zinc-100 font-pixel text-[10px] md:text-xs lg:text-sm sticky top-0 z-10 shrink-0 uppercase">
                            <div className="col-span-2 p-3 border-r-2 border-black text-center">RANK</div>
                            <div className="col-span-6 p-3 border-r-2 border-black">HANDLE</div>
                            <div className="col-span-2 p-3 border-r-2 border-black text-center">SOLVES</div>
                            <div className="col-span-2 p-3 text-right">SCORE</div>
                        </div>

                        {/* Scrollable Table Body */}
                        <div className="overflow-y-auto flex-1 scrollbar-hide">
                            {teams.map((team, index) => {
                                const isSelected = selectedTeamId === team.id;
                                return (
                                    <div
                                        key={team.id}
                                        className="contents" // Use contents to let children sit directly in the grid container
                                    >
                                        <div
                                            onClick={() => handleTeamClick(team.id)}
                                            className={`grid grid-cols-12 gap-0 border-b border-dashed border-zinc-300 cursor-pointer font-mono text-sm group transition-colors col-span-12
                                                ${isSelected ? 'bg-retro-green text-black font-bold' : 'hover:bg-zinc-50'}
                                            `}
                                        >
                                            <div className="col-span-2 p-2 border-r border-zinc-200 flex items-center justify-center">
                                                {index + 1}
                                            </div>
                                            <div className="col-span-6 p-2 border-r border-zinc-200 truncate pl-4 flex items-center justify-between group/name">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                    <Link href={`/team/${team.id}`} className="hover:underline hover:text-blue-600 decoration-2 underline-offset-2 z-20 relative pointer-events-auto truncate" onClick={(e) => e.stopPropagation()}>
                                                        {team.name}
                                                    </Link>
                                                </div>
                                                {isSelected && <span className="block text-[10px] opacity-70 shrink-0">▼ EXPANDED</span>}
                                            </div>
                                            <div className="col-span-2 p-2 border-r border-zinc-200 text-center">
                                                {team.history.length}
                                            </div>
                                            <div className="col-span-2 p-2 text-right pr-4">
                                                {team.points}
                                            </div>
                                        </div>

                                        {/* Expanded Member Details */}
                                        {isSelected && (
                                            <div className="col-span-12 bg-zinc-50 border-b border-black p-3 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                                                <div className="font-pixel text-[10px] text-zinc-400 mb-2">ROSTER_MANIFEST_</div>
                                                <div className="flex flex-col gap-2">
                                                    {team.members.map((member, mIndex) => (
                                                        <Link
                                                            key={mIndex}
                                                            href={member.id ? `/profile/${member.id}` : '#'}
                                                            className={`bg-white border border-zinc-200 p-2 flex items-center gap-2 shadow-sm transition-transform hover:translate-y-[-2px] hover:shadow-md ${!member.id ? 'pointer-events-none' : ''}`}
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0 border border-black">
                                                                {member.profileUrl ? (
                                                                    <Image src={member.profileUrl} alt={member.name || 'User'} width={24} height={24} />
                                                                ) : (
                                                                    <span className="text-[10px] font-mono">?</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold text-xs truncate group-hover:text-retro-green transition-colors">
                                                                    {member.name || member.email?.split('@')[0] || 'Unknown'}
                                                                </div>
                                                            </div>
                                                            <div className="font-mono text-retro-green font-bold text-xs">
                                                                {member.points}
                                                            </div>
                                                        </Link>
                                                    ))}
                                                    {team.members.length === 0 && (
                                                        <div className="text-zinc-400 text-xs font-mono italic">No members...</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {teams.length === 0 && (
                                <div className="p-8 text-center text-zinc-400 font-pixel">NO TEAMS</div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Graph & Stats */}
                    <div className="flex-1 flex flex-col gap-6 min-h-0 min-w-0">

                        {/* 1. Score Graph */}
                        <div className="bg-white border-2 border-black p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-1 min-h-[300px] flex flex-col">
                            <div className="flex justify-between items-center mb-2 px-2 border-b-2 border-dashed border-zinc-300 pb-2 shrink-0">
                                <h2 className="font-pixel text-lg">TOP TEAMS</h2>
                                <span className="font-mono text-xs text-retro-green font-bold px-2 py-1 bg-black/5 rounded">
                                    &gt; {selectedTeam?.name || "SELECT TEAM"}
                                </span>
                            </div>

                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            type="number"
                                            domain={['auto', 'auto']}
                                            tick={false}
                                            axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                        />
                                        <YAxis
                                            orientation="left"
                                            tickLine={false}
                                            axisLine={{ stroke: '#000', strokeWidth: 2 }}
                                            tick={{ fontFamily: 'monospace', fontSize: 10 }}
                                        />
                                        <Tooltip
                                            labelFormatter={(value) => new Date(value).toLocaleString()}
                                            contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', fontFamily: 'monospace', fontSize: 11 }}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, paddingTop: 8 }}
                                            formatter={(value) => <span style={{ color: '#111' }}>{value}</span>}
                                        />
                                        {teams
                                            .filter(team => visibleTeamIds.includes(team.id))
                                            .map((team, index) => {
                                                const teamIndex = teams.findIndex(t => t.id === team.id);
                                                const color = COLORS[teamIndex % COLORS.length];
                                                const isSelected = selectedTeamId === team.id;
                                                return (
                                                    <Line
                                                        key={team.id}
                                                        data={team.history.map(h => ({ ...h, time: new Date(h.time).getTime() }))}
                                                        type="stepAfter"
                                                        dataKey="score"
                                                        name={team.name}
                                                        stroke={color}
                                                        strokeWidth={isSelected ? 3 : 1.5}
                                                        dot={isSelected
                                                            ? { r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }
                                                            : false
                                                        }
                                                        activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: color }}
                                                        opacity={isSelected ? 1 : 0.6}
                                                        animationDuration={500}
                                                    />
                                                );
                                            })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Categories Solved */}
                        <div className="bg-white border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shrink-0 min-h-[150px] lg:h-[200px] overflow-y-auto">
                            <h2 className="font-pixel text-base lg:text-lg mb-4 border-b-2 border-dashed border-zinc-300 pb-2">CATEGORIES_SOLVED</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                {categoryData.length > 0 ? categoryData.map((cat) => (
                                    <div key={cat.name} className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-retro-green animate-pulse"></div>
                                        <span className="font-mono text-sm font-bold w-24 text-right">{cat.name}:</span>
                                        <div className="flex-1 h-4 bg-zinc-100 border border-zinc-300 relative">
                                            <div
                                                className="h-full bg-retro-green/50"
                                                style={{ width: `${Math.min((cat.count / 10) * 100, 100)}%` }} // Arbitrary max 10 for bar
                                            ></div>
                                        </div>
                                        <span className="font-mono text-xs">{cat.count}</span>
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center text-zinc-400 font-mono text-sm py-4">
                                        NO SOLVES YET
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </RetroLayout>
    );
}
