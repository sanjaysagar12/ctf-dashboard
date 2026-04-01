"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type TriggerData = {
    announcements?: boolean;
    challenges?: boolean;
    leaderboard?: boolean;
    status?: boolean;
};

type TriggerContextType = Record<string, never>;

const TriggerContext = createContext<TriggerContextType | undefined>(undefined);

// Internal context keeps the subscribe API so existing hook callers don't break,
// but no SSE connection is made — the callback will simply never fire.
const InternalTriggerContext = createContext<{ subscribe: (cb: (data: TriggerData) => void) => () => void } | undefined>(undefined);

export const TriggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const listeners = useRef<Set<(data: TriggerData) => void>>(new Set());

    const subscribe = useCallback((callback: (data: TriggerData) => void) => {
        listeners.current.add(callback);
        return () => listeners.current.delete(callback);
    }, []);


    // Real-time updates are no longer needed; pages fetch on mount instead.

    return (
        <TriggerContext.Provider value={{}}>
            <InternalTriggerContext.Provider value={{ subscribe }}>
                {children}
            </InternalTriggerContext.Provider>
        </TriggerContext.Provider>
    );
};

export const useTriggerSubscription = (onTrigger: (data: TriggerData) => void) => {
    const ctx = useContext(InternalTriggerContext);
    if (!ctx) throw new Error('useTriggerSubscription must be used within TriggerProvider');

    const cbRef = useRef(onTrigger);
    useEffect(() => {
        cbRef.current = onTrigger;
    }, [onTrigger]);

    useEffect(() => {
        const unsubscribe = ctx.subscribe((data) => cbRef.current(data));
        return () => unsubscribe();
    }, [ctx]);
};
