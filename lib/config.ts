// lib/config.ts
import fs from 'fs';
import path from 'path';

export interface AppConfig {
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

const CONFIG_FILE = path.join(process.cwd(), 'event-config.json');

const DEFAULT_CONFIG: AppConfig = {
    dynamicScoring: false,
    eventState: 'START',
    rateLimit: {
        maxAttempts: 3,
        windowSeconds: 30,
        cooldownSeconds: 60
    },
    publicChallenges: true,
    publicLeaderboard: true
};

function readConfigFile(): AppConfig {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            // Merge with defaults to fill any missing fields
            return {
                ...DEFAULT_CONFIG,
                ...parsed,
                rateLimit: {
                    ...DEFAULT_CONFIG.rateLimit,
                    ...(parsed.rateLimit || {})
                }
            };
        }
    } catch (e) {
        console.error('[CONFIG] Failed to read event-config.json, using defaults:', e);
    }
    return { ...DEFAULT_CONFIG };
}

// In-memory config state, seeded once from event-config.json at process start.
// Runtime updates (e.g. admin toggling eventState) are kept in memory only —
// event-config.json is never written to, so it always reflects the initial/default state.
let memoryConfig: AppConfig | null = null;

function getMemoryConfig(): AppConfig {
    if (memoryConfig === null) {
        memoryConfig = readConfigFile();
        console.log('[CONFIG] Initialized in-memory config from event-config.json:', memoryConfig);
    }
    return memoryConfig;
}

export async function getConfig(): Promise<AppConfig> {
    const currentConfig = getMemoryConfig();

    // Still allow env-var overrides for static/deployment-time settings
    const dynamicScoring = process.env.DYNAMIC_SCORING === 'true' || currentConfig.dynamicScoring;
    const rateLimit = {
        maxAttempts: Number(process.env.RATE_LIMIT_MAX_ATTEMPTS) || currentConfig.rateLimit.maxAttempts,
        windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || currentConfig.rateLimit.windowSeconds,
        cooldownSeconds: Number(process.env.RATE_LIMIT_COOLDOWN_SECONDS) || currentConfig.rateLimit.cooldownSeconds,
    };

    return {
        ...currentConfig,
        dynamicScoring,
        rateLimit,
    };
}

export async function updateConfig(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await getConfig();

    // Validate eventState if provided
    let validatedNewConfig = { ...newConfig };
    if (newConfig.eventState) {
        const validStates = ['START', 'PAUSE', 'STOP'];
        if (!validStates.includes(newConfig.eventState)) {
            console.warn(`Invalid eventState '${newConfig.eventState}'. Keeping current state.`);
            delete validatedNewConfig.eventState;
        }
    }

    const updatedConfig: AppConfig = {
        ...currentConfig,
        ...validatedNewConfig,
        rateLimit: {
            ...currentConfig.rateLimit,
            ...(validatedNewConfig.rateLimit || {})
        }
    };

    memoryConfig = updatedConfig;
    console.log('[CONFIG] In-memory config updated (event-config.json left untouched):', updatedConfig);
    return updatedConfig;
}
