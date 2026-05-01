// app/api/scripts-config/route.ts
import { NextResponse } from 'next/server';

// This configuration can be stored in a JSON file or database.
// For now, we'll hardcode it as an example.
const scriptsConfig = {
    angor: {
        name: "انگور",
        desc: "بزن بزن ، تک به تک",
        icon: "Grape",
        url: "/angor",
        state: false,
        available: false
    },
    mission: {
        name: "ماموریت",
        desc: "انجام خودکار مأموریت‌ها",
        icon: "Swords",
        url: "/mission",
        state: false,
        available: false
    },
    tribe: {
        name: "قبیله",
        desc: "قبیله خود را مدیریت کنید.",
        icon: "ChessRook",
        url: "/tribe",
        state: false,
        available: false
    },
    transfer: {
        name: "کارت به کارت",
        desc: "انتقال تک پیش کارت",
        icon: "Package",
        url: "/transfer",
        state: true,
        available: false
    },
    drone: {
        name: "ویژ ویژ",
        desc: "پهپادبازی",
        icon: "Drone",
        url: "/drone",
        state: false,
        available: false
    },
    miner: {
        name: "استخراج طلا",
        desc: "مدیریت معدن و جمع‌آوری خودکار طلا",
        icon: "Pickaxe",
        url: "/miner",
        state: true,
        available: true
    }
};

export async function GET() {
    return NextResponse.json(scriptsConfig);
}