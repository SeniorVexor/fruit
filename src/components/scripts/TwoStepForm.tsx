'use client';

import {useState} from 'react';
import {Key, Play, Zap, MinusCircle, ArrowRight} from 'lucide-react';
import router from "next/router";

interface Props {
    onConfirm: (payload: {
        restore_key: string;
        attacks: number;
        doon_mode: string;
    }) => void;
}

export default function TwoStepForm({onConfirm}: Props) {
    const [restoreKey, setRestoreKey] = useState('');
    const [attacks, setAttacks] = useState('7');
    const [doonManfi, setDoonManfi] = useState(false);

    const isPosInt = (v: string) => /^[1-9]\d*$/.test(v);

    const canSubmit = restoreKey.trim() !== '' && isPosInt(attacks);

    const handleSubmit = () => {
        onConfirm({
            restore_key: restoreKey.trim(),
            attacks: Number(attacks),
            doon_mode: doonManfi ? '-' : '+'
        });
    };

    return (
        <fieldset className="flex card bg-base-200 shadow-xl p-6 gap-4 ">

            <legend
                className="fieldset-legend bg-base-200 border-2 border-base-100 p-2 rounded-box text-lg font-bold flex items-center gap-2">
                <Key className="w-5 h-5"/>
                اسکریپت انگور
            </legend>

            {/* ۱) Restore Key */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text flex items-center gap-2">
                        <Key className="w-4 h-4"/>
                        کلید بازیابی
                    </span>
                </label>
                <input
                    name='EX-RestoreKey'
                    type="text"
                    required
                    placeholder="مثلا: four1234some"
                    value={restoreKey}
                    onChange={(e) => setRestoreKey(e.target.value)}
                    className="input input-bordered w-full"
                />
                <label className="label">
                    <span className="label-text-alt text-error validator-hint">وارد کردن کلید الزامی است.</span>
                </label>

            </div>

            {/* ۲) Count Attacks */}
            <div className="form-control">
                <label className="label">
                    <span className="label-text flex items-center gap-2">
                        <Zap className="w-4 h-4"/>
                        تعداد حملات به هر نفر
                        ( {attacks} )
                    </span>
                </label>

                <input
                    type="range"
                    required
                    min="1"
                    max="50"
                    value={attacks}
                    onChange={(e) => setAttacks(e.target.value)}
                    className="range w-full text-primary/50"
                />
                <div className="flex justify-between px-2.5 my-2 text-xs ">
                    <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span><span>35</span><span>40</span><span>45</span><span>50</span>
                </div>
                {!isPosInt(attacks) && (
                    <label className="label">
                        <span className="label-text-alt text-error">عدد صحیح مثبت وارد کنید.</span>
                    </label>
                )}
            </div>

            {/* ۳) Doon Manfi Checkbox */}
            {/*<div className="form-control">*/}
            {/*    <label className="label cursor-pointer justify-start gap-3">*/}
            {/*        <input*/}
            {/*            type="checkbox"*/}
            {/*            checked={doonManfi}*/}
            {/*            onChange={(e) => setDoonManfi(e.target.checked)}*/}
            {/*            className="checkbox checkbox-primary"*/}
            {/*        />*/}
            {/*        <span className="label-text flex items-center gap-2">*/}
            {/*            <MinusCircle className="w-4 h-4"/>*/}
            {/*            حالت دون منفی (کاهش اسکور)*/}
            {/*        </span>*/}
            {/*    </label>*/}
            {/*</div>*/}

            {/* دکمه شروع */}
            <button
                className="btn btn-primary mt-4 w-full"
                disabled={!canSubmit}
                onClick={handleSubmit}
            >
                <Play className="w-4 h-4"/>
                شروع اسکریپت
            </button>
        </fieldset>
    );
}