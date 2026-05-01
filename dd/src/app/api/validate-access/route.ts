// app/api/validate-access/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface Rule {
    pattern: string;          // literal string or regex source (if isRegex true)
    matchType: 'exact' | 'prefix';
    isRegex?: boolean;        // default false
    action: 'allow' | 'block';
}

// Rules are evaluated in order – first match wins.
const RULES: Rule[] = [
    // ----- BLOCK exact / prefix (literal) -----
    { pattern: '/', matchType: 'exact', action: 'block' },
    { pattern: '/auth', matchType: 'exact', action: 'block' },
    { pattern: '/auth/error', matchType: 'prefix', action: 'block' },  // block all error pages
    { pattern: '/auth/token/secret-admin', matchType: 'exact', action: 'block' },

    // ----- BLOCK using regex -----
    { pattern: '^/auth/token/[^/]+/dashboard$', matchType: 'exact', isRegex: true, action: 'block' },
    { pattern: '^/auth/token/[^/]+/dash$',      matchType: 'exact', isRegex: true, action: 'block' },
    { pattern: '^/auth/token/[^/]+/scripts/(?!miner).*', matchType: 'exact', isRegex: true, action: 'block' },
    { pattern: '^/auth/token/[^/]+/scripts/angor', matchType: 'exact', isRegex: true, action: 'block' },

    // ----- ALLOW everything else under /auth/token (including miner) -----
    { pattern: '/auth/token', matchType: 'prefix', action: 'allow' },

    // Default: if no rule matches, we block (you can change to allow)
];

function matchesRule(pathname: string, rule: Rule): boolean {
    if (rule.isRegex) {
        try {
            const regex = new RegExp(rule.pattern);
            return regex.test(pathname);
        } catch (e) {
            console.error('Invalid regex:', rule.pattern, e);
            return false;
        }
    } else {
        if (rule.matchType === 'exact') {
            return pathname === rule.pattern;
        } else if (rule.matchType === 'prefix') {
            return pathname.startsWith(rule.pattern);
        }
    }
    return false;
}

function checkAccess(pathname: string): { allowed: boolean; redirectTo?: string } {
    for (const rule of RULES) {
        if (matchesRule(pathname, rule)) {
            if (rule.action === 'allow') {
                return { allowed: true };
            } else {
                return { allowed: false, redirectTo: '/auth/error/access-denied' };
            }
        }
    }
    // No rule matched → block by default
    return { allowed: false, redirectTo: '/auth/error/access-denied' };
}

export async function POST(req: NextRequest) {
    try {
        const { path, token } = await req.json();
        const { allowed, redirectTo } = checkAccess(path);
        if (!allowed) {
            return NextResponse.json({ allowed: false, redirectTo });
        }
        // Optional: add token validation or subscription checks here
        return NextResponse.json({ allowed: true });
    } catch (error) {
        console.error('Validation error:', error);
        return NextResponse.json(
            { allowed: false, redirectTo: '/auth/error/server-error' },
            { status: 500 }
        );
    }
}