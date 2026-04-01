"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import RetroLayout from "@/components/RetroLayout";

interface Challenge {
    id: string;
    title: string;
    description: string;
    theme: string;
    fileType: 'CHALLENGE' | 'DOWNLOAD' | 'RESOURCE';
    link?: string;
    thumbnail?: string;
    points: number;
    solved: boolean;
    attachment?: string;
    hints: {
        id: string;
        cost: number;
        content?: string;
        purchased: boolean;
    }[];
    author?: {
        name: string | null;
    };
}

export default function ChallengesPage() {
    const { token, dbUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [flagInput, setFlagInput] = useState("");
    const [response, setResponse] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Selection State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

    const [eventState, setEventState] = useState<'START' | 'PAUSE' | 'STOP'>('START');

    // Cooldown State
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

    const [accessDenied, setAccessDenied] = useState(false);

    const fetchStatus = async () => {
        try {
            const resStatus = await fetch("/api/status");
            if (resStatus.ok) {
                const data = await resStatus.json();
                setEventState(data.eventState);
            }
        } catch (error) {
            console.error("Failed to fetch status", error);
        }
    };

    const fetchChallengesList = async () => {
        try {
            const endpoint = token ? "/api/challenges" : "/api/challenges/public";
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(endpoint, { headers });

            if (res.ok) {
                const data = await res.json();
                setChallenges(data);
                setAccessDenied(false);
                if (data.length > 0 && !selectedCategory) {
                    const firstTheme = data[0].theme;
                    setSelectedCategory(firstTheme);
                    const firstChall = data.find((c: Challenge) => c.theme === firstTheme);
                    if (firstChall) setSelectedChallenge(firstChall);
                }
            } else if (res.status === 403) {
                setAccessDenied(true);
            }
        } catch (error) {
            console.error("Failed to fetch challenges", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchStatus();
            fetchChallengesList();
        }
    }, [token, authLoading]);



    useEffect(() => {
        if (!cooldownUntil) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
            setCooldownRemaining(remaining);

            if (remaining <= 0) {
                setCooldownUntil(null);
                setCooldownRemaining(0);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [cooldownUntil]);

    // Derived Data
    const categoryStats = useMemo(() => {
        const stats: Record<string, { total: number; solved: number }> = {};
        challenges.forEach(c => {
            if (!stats[c.theme]) {
                stats[c.theme] = { total: 0, solved: 0 };
            }
            stats[c.theme].total++;
            if (c.solved) {
                stats[c.theme].solved++;
            }
        });
        return stats;
    }, [challenges]);

    const categories = useMemo(() => {
        return Object.keys(categoryStats);
    }, [categoryStats]);

    const filteredChallenges = useMemo(() => {
        return challenges.filter(c => c.theme === selectedCategory);
    }, [challenges, selectedCategory]);

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        const firstInCat = challenges.find(c => c.theme === category);
        setSelectedChallenge(firstInCat || null);
        setFlagInput("");
        setResponse(null);
    };

    const handleChallengeClick = (challenge: Challenge) => {
        setSelectedChallenge(challenge);
        setFlagInput("");
        setResponse(null);
    };

    const handleBuyHint = async (hintId: string, cost: number) => {
        if (!selectedChallenge || !confirm(`Are you sure you want to buy this hint for ${cost} points?`)) return;

        try {
            const res = await fetch("/api/challenges/hint", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ hintId }),
            });
            const data = await res.json();

            if (res.ok) {
                // Update local state to show hint content
                setChallenges(prev => prev.map(c => {
                    if (c.id === selectedChallenge.id) {
                        return {
                            ...c,
                            hints: c.hints.map(h => h.id === hintId ? { ...h, content: data.content, purchased: true } : h)
                        };
                    }
                    return c;
                }));
                // Also update selectedChallenge if it's the one modified
                setSelectedChallenge(prev => {
                    if (prev && prev.id === selectedChallenge.id) {
                        return {
                            ...prev,
                            hints: prev.hints.map(h => h.id === hintId ? { ...h, content: data.content, purchased: true } : h)
                        };
                    }
                    return prev;
                });
                alert(`Hint Unlocked!`);
            } else {
                alert(`Failed to buy hint: ${data.error || data.message}`);
            }
        } catch (error) {
            console.error("Buy hint error:", error);
            alert("Network error buying hint.");
        }
    };

    const handleSubmit = async () => {
        if (!selectedChallenge || !flagInput || eventState !== 'START') return;
        setSubmitting(selectedChallenge.id);
        setResponse(null);

        try {
            const res = await fetch("/api/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ challengeId: selectedChallenge.id, flag: flagInput }),
            });
            const data = await res.json();
            if (res.ok) {
                setResponse({ type: "success", message: data.message });
                setChallenges(prev => prev.map(c => c.id === selectedChallenge.id ? { ...c, solved: true } : c));
                setSelectedChallenge(prev => prev ? { ...prev, solved: true } : null);
            } else {
                if (res.status === 429) {
                    setResponse({ type: "error", message: data.error });
                    // Set cooldown
                    const cooldownSeconds = data.cooldownRemaining || 60;
                    setCooldownUntil(Date.now() + (cooldownSeconds * 1000));
                    setCooldownRemaining(cooldownSeconds);
                } else {
                    setResponse({ type: "error", message: data.error });
                }
            }
        } catch {
            setResponse({ type: "error", message: "Network error." });
        } finally {
            setSubmitting(null);
        }
    };

    if (loading || authLoading) {
        return <div className="min-h-screen bg-retro-bg flex items-center justify-center font-pixel text-xl">LOADING...</div>;
    }

    if (accessDenied && !token) {
        return (
            <div className="flex min-h-screen flex-col bg-retro-bg text-black font-mono-retro">
                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                    <h1 className="text-4xl font-pixel text-red-600">ACCESS DENIED</h1>
                    <p className="text-xl">Public visibility is currently disabled for this sector.</p>
                    <button onClick={() => router.push('/')} className="mt-4 px-6 py-2 border-2 border-black bg-white hover:bg-zinc-100 font-pixel">BACK TO BASE</button>
                </div>
            </div>
        );
    }


    return (
        <RetroLayout title="Challenges" activePage="challenges">
            <div className="flex flex-1 overflow-hidden relative border-t-2 md:border-t-0 border-retro-border">
                {/* 2. CATEGORIES COLUMN */}
                <div className="w-64 lg:w-80 shrink-0 border-r-2 border-retro-border bg-white flex flex-col overflow-y-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`p-6 text-left border-b-2 border-retro-border transition-all hover:pl-8 group relative ${selectedCategory === cat
                                ? "bg-retro-green"
                                : "hover:bg-zinc-50"
                                }`}
                        >
                            <span className={`text-2xl lg:text-4xl font-pixel block break-words leading-tight ${selectedCategory === cat ? 'animate-pulse' : ''}`}>
                                {cat}
                            </span>
                            <div className="text-xs font-mono mt-1 text-zinc-500 group-hover:text-black">
                                [{categoryStats[cat].solved}/{categoryStats[cat].total}] SOLVED
                            </div>
                            {/* Decorative Icon based on category? */}
                            <span className="absolute top-2 right-2 text-xs font-mono opacity-50 block group-hover:opacity-100">
                                {selectedCategory === cat ? '< SELECTED' : ''}
                            </span>
                        </button>
                    ))}
                    {/* Fill empty space */}
                    <div className="flex-1 bg-zinc-50/50 relative">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,#00000005_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                    </div>
                </div>

                {/* 3. CHALLENGE LIST COLUMN */}
                <div className="w-56 lg:w-72 shrink-0 border-r-2 border-retro-border bg-zinc-50 flex flex-col overflow-y-auto">
                    {filteredChallenges.map(challenge => (
                        <button
                            key={challenge.id}
                            onClick={() => handleChallengeClick(challenge)}
                            className={`p-4 border-b border-retro-border/20 text-left transition-colors flex justify-between items-center ${challenge.solved
                                ? "bg-retro-green text-black"
                                : selectedChallenge?.id === challenge.id
                                    ? "bg-white"
                                    : "hover:bg-white text-zinc-600"
                                } ${selectedChallenge?.id === challenge.id ? "border-l-4 border-l-black" : ""}`}
                        >
                            <div className="flex-1 min-w-0 pr-2">
                                <span className="text-xl font-bold truncate block">{challenge.title.toUpperCase()}</span>
                                <span className="text-sm font-mono block">{challenge.points}pt</span>
                            </div>
                            {challenge.solved && (
                                <span className="text-retro-green text-xl">★</span>
                            )}
                        </button>
                    ))}
                    {filteredChallenges.length === 0 && (
                        <div className="p-8 text-zinc-400 italic">No challenges here yet.</div>
                    )}
                </div>

                {/* 4. DETAILS PANE (Main) */}
                <div className="flex-1 bg-white relative flex flex-col overflow-y-auto h-full scrollbar-retro">
                    {/* Retro Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                    {selectedChallenge ? (
                        <div className="relative z-10 p-4 md:p-8 lg:p-12 max-w-4xl mx-auto w-full">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row items-start justify-between mb-8 md:mb-12 border-b-2 border-black pb-4 border-dashed gap-4">
                                <h1 className="text-3xl md:text-5xl lg:text-6xl font-pixel font-normal text-black leading-tight break-words flex-1">
                                    {selectedChallenge.title}
                                </h1>
                                <div className="border-2 border-black p-3 md:p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative shrink-0">
                                    <div className="absolute -top-3 -left-3 bg-white px-1 text-[10px] font-bold border border-black">POINTS</div>
                                    <span className="text-2xl md:text-4xl font-mono-retro font-bold">{selectedChallenge.points}pt</span>
                                    {/* Bracket corners */}
                                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-black"></div>
                                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-black"></div>
                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-black"></div>
                                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-black"></div>
                                </div>
                            </div>

                            {/* Question Mark / Icon */}
                            <div className="hidden lg:block mb-8 text-8xl opacity-10 font-pixel select-none absolute top-40 right-12 z-0">?</div>

                            {/* Description */}
                            <div className="prose prose-p:font-mono-retro prose-headings:font-pixel font-normal max-w-none text-base md:text-lg lg:text-xl mb-8 relative z-10 bg-white/80 p-4 border border-zinc-100 backdrop-blur-sm rounded">
                                <ReactMarkdown
                                    components={{
                                        p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-4" {...props} />
                                    }}
                                >
                                    {selectedChallenge.description}
                                </ReactMarkdown>
                            </div>

                            {/* Link Buttons */}
                            {selectedChallenge.link && (
                                <div className="mb-8 flex flex-wrap gap-4">
                                    {selectedChallenge.link.split('\n').filter(l => l.trim()).map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex bg-purple-600 text-white font-bold py-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all items-center gap-2 border-2 border-black no-underline"
                                        >
                                            <span>
                                                {selectedChallenge.fileType === 'DOWNLOAD' ? '💾 DOWNLOAD' :
                                                    selectedChallenge.fileType === 'RESOURCE' ? '📚 RESOURCE' :
                                                        '🔗 LINK'}
                                            </span>
                                            {url.trim().length > 20 && (
                                                <span className="font-mono text-sm bg-black/20 px-2 rounded truncate max-w-[200px]">
                                                    {url.trim()}
                                                </span>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Separator */}
                            <div className="w-full h-[2px] bg-black my-8 opacity-20"></div>

                            {/* HINTS SECTION */}
                            {selectedChallenge.hints && selectedChallenge.hints.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="font-pixel text-xl mb-4">HINTS</h3>
                                    <div className="flex flex-col gap-4">
                                        {selectedChallenge.hints.map((hint, idx) => (
                                            <div key={hint.id} className="border-2 border-black p-4 bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold font-mono">HINT #{idx + 1}</span>
                                                    {!hint.purchased && (
                                                        <span className="bg-black text-white px-2 py-1 font-mono text-xs rounded">
                                                            COST: {hint.cost} PTS
                                                        </span>
                                                    )}
                                                </div>

                                                {hint.purchased ? (
                                                    <div className="font-mono text-lg text-zinc-800 bg-white p-3 border border-zinc-200">
                                                        {hint.content}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => token ? handleBuyHint(hint.id, hint.cost) : alert("Please login to purchase hints")}
                                                        className={`w-full py-3 border-2 border-dashed font-pixel transition-colors ${!token ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-200 border-zinc-400 text-zinc-500 hover:bg-retro-green hover:text-black hover:border-black'}`}
                                                    >
                                                        {token ? 'UNLOCK HINT' : 'LOGIN TO UNLOCK'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full h-[2px] bg-black my-8 opacity-20"></div>
                                </div>
                            )}

                            {/* Submission Area */}
                            <div className={`p-6 border-2 transition-all ${selectedChallenge.solved ? 'bg-retro-green border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-zinc-100 border-zinc-200 shadow-none'}`}>
                                {eventState !== 'START' && (
                                    <div className="mb-6 bg-yellow-100 border-2 border-yellow-500 p-4 text-yellow-800 font-bold font-pixel text-center uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                        ⚠️ EVENT IS {eventState === 'STOP' ? 'STOPPED' : 'PAUSED'}. SUBMISSIONS DISABLED.
                                    </div>
                                )}

                                {selectedChallenge.solved ? (
                                    <div className="text-black font-bold text-2xl flex items-center gap-4 uppercase font-pixel tracking-tighter">
                                        <span>★ FLAG CAPTURED</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="font-mono text-sm uppercase tracking-widest text-zinc-500">Submit Flag</p>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                disabled={eventState !== 'START' || !token || !dbUser?.teamId}
                                                placeholder={!token ? "LOGIN TO SUBMIT" : !dbUser?.teamId ? "JOIN A TEAM" : eventState === 'START' ? "CCEE{...}" : "LOCKED"}
                                                className="flex-1 bg-white border-2 border-black p-4 font-mono text-lg outline-none focus:shadow-[4px_4px_0px_0px_#ccff00] disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed"
                                                value={flagInput}
                                                onChange={(e) => setFlagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                            />
                                            <button
                                                onClick={() => token ? handleSubmit() : router.push('/')}
                                                disabled={!!(token && (submitting === selectedChallenge.id || eventState !== 'START' || !!cooldownUntil || !dbUser?.teamId))}
                                                className={`px-8 py-4 font-bold transition-colors border-2 disabled:cursor-not-allowed
                                            ${!token
                                                        ? 'bg-purple-600 text-white border-black hover:bg-purple-700'
                                                        : submitting === selectedChallenge.id || eventState !== 'START'
                                                            ? 'bg-zinc-200 text-zinc-500 border-zinc-300'
                                                            : cooldownUntil
                                                                ? 'bg-red-200 text-red-800 border-red-800'
                                                                : !dbUser?.teamId
                                                                    ? 'bg-zinc-200 text-zinc-500 border-zinc-300'
                                                                    : 'bg-black text-white hover:bg-retro-green hover:text-black hover:border-black'
                                                    }`}
                                            >
                                                {!token
                                                    ? 'LOGIN'
                                                    : submitting === selectedChallenge.id
                                                        ? "..."
                                                        : cooldownUntil
                                                            ? `WAIT ${cooldownRemaining}s`
                                                            : !dbUser?.teamId
                                                                ? "NO TEAM"
                                                                : "SUBMIT"}
                                            </button>
                                        </div>
                                        {!dbUser?.teamId && token && (
                                            <div className="mt-2 text-red-600 font-bold bg-red-50 border border-red-200 p-2 text-sm uppercase">
                                                {'>'} MUST JOIN OR CREATE A TEAM TO SUBMIT FLAGS
                                            </div>
                                        )}
                                        {response && (
                                            <div className={`mt-2 font-bold ${response.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                                {'>'} {response.message}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Created By */}
                            <div className="mt-8 text-sm font-mono text-zinc-500">
                                <span className="font-bold">By:</span> <span className="text-black">{selectedChallenge.author?.name || 'Unknown'}</span>
                            </div>

                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-400 font-pixel text-2xl animate-pulse">
                            SELECT A CHALLENGE
                        </div>
                    )}
                </div>
            </div>
        </RetroLayout>
    );
}
