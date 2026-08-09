"use client";

import { useEffect, useState } from "react";
import styles from "./shampoo-scada.module.css";

type BottleState = "moving" | "aligned" | "filling" | "done";

export function ShampooScada({ connected }: { connected: boolean }) {
  const [running, setRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [bottleState, setBottleState] = useState<BottleState>("moving");
  const [fillAmount, setFillAmount] = useState(0);
  const [targetLiters, setTargetLiters] = useState(2);
  const [completedBottles, setCompletedBottles] = useState(0);
  const [bottlePosition, setBottlePosition] = useState("-60px");
  const [resettingBottle, setResettingBottle] = useState(false);

  useEffect(() => {
    if (!running || bottleState !== "moving") return;
    const moveBottle = window.setTimeout(() => setBottlePosition("50%"), 50);
    const timer = window.setTimeout(() => setBottleState("aligned"), 2200);
    return () => {
      window.clearTimeout(moveBottle);
      window.clearTimeout(timer);
    };
  }, [bottleState, running]);

  useEffect(() => {
    if (!running || !autoMode || bottleState !== "aligned") return;
    const timer = window.setTimeout(() => setBottleState("filling"), 0);
    return () => window.clearTimeout(timer);
  }, [autoMode, bottleState, running]);

  useEffect(() => {
    if (!running || bottleState !== "filling") return;
    const interval = window.setInterval(() => {
      setFillAmount((current) => Math.min(current + 0.04, targetLiters));
    }, 80);
    return () => window.clearInterval(interval);
  }, [bottleState, running, targetLiters]);

  useEffect(() => {
    if (bottleState !== "filling" || fillAmount < targetLiters) return;
    const timer = window.setTimeout(() => {
      setBottleState("done");
      setCompletedBottles((count) => count + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bottleState, fillAmount, targetLiters]);

  useEffect(() => {
    if (!running || bottleState !== "done") return;
    const moveToBox = window.setTimeout(
      () => setBottlePosition("calc(100% - 70px)"),
      50,
    );
    const timer = window.setTimeout(() => {
      setFillAmount(0);
      setResettingBottle(true);
      setBottlePosition("-60px");
      window.setTimeout(() => {
        setResettingBottle(false);
        setBottleState("moving");
      }, 50);
    }, 1800);
    return () => {
      window.clearTimeout(moveToBox);
      window.clearTimeout(timer);
    };
  }, [bottleState, running]);

  function startSystem() {
    if (!connected) return;
    setRunning(true);
    setResettingBottle(false);
    setFillAmount(0);
    setBottlePosition("-60px");
    setBottleState("moving");
  }

  function stopSystem() {
    setRunning(false);
    setBottleState("moving");
    setFillAmount(0);
    setResettingBottle(false);
    setBottlePosition("-60px");
  }

  const isFilling = bottleState === "filling";
  const isAligned = bottleState === "aligned";
  const fillPercent = Math.min((fillAmount / 5) * 95, 95);
  const status = !connected
    ? "Connect to GX Simulator to operate"
    : !running
      ? "System stopped"
      : isFilling
        ? "Filling shampoo..."
        : isAligned && !autoMode
          ? "Waiting for manual fill"
          : bottleState === "done"
            ? "Bottle filled successfully"
            : "Conveyor running";

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#20202c] p-4 shadow-2xl shadow-black/30 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cyan-300">SCADA simulation</p>
          <h2 className="text-2xl font-bold">Shampoo Filling Line</h2>
        </div>
        <span className={connected ? "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300" : "rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400"}>
          {connected ? "PLC control enabled" : "PLC disconnected"}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="relative min-h-[450px] overflow-hidden rounded-xl border-2 border-white/10 bg-[#0d0d13]">
          <div className="absolute left-1/2 top-5 h-36 w-40 -translate-x-1/2 overflow-hidden rounded-b-xl border-4 border-t-0 border-slate-300/70 bg-white/5">
            <div className="absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-b from-cyan-400 to-blue-600" />
          </div>
          <div className="absolute left-1/2 top-40 h-16 w-4 -translate-x-1/2 bg-slate-400/70" />
          <div className="absolute left-1/2 top-44 grid h-8 w-10 -translate-x-1/2 place-items-center rounded-md bg-slate-600">
            <span className={isFilling ? "h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" : "h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e]"} />
          </div>
          {isFilling && <div className="absolute left-1/2 top-56 h-24 w-2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 via-cyan-200 to-cyan-400 shadow-[0_0_14px_#22d3ee]" />}
          <div className={running ? "absolute bottom-[110px] h-5 w-full " + styles.conveyor + " " + styles.conveyorRunning : "absolute bottom-[110px] h-5 w-full " + styles.conveyor} />
          <div className={resettingBottle ? "absolute bottom-[130px] h-20 w-11 -translate-x-1/2 overflow-hidden rounded-t-lg rounded-b-md border-2 border-slate-100/90 bg-white/10" : "absolute bottom-[130px] h-20 w-11 -translate-x-1/2 overflow-hidden rounded-t-lg rounded-b-md border-2 border-slate-100/90 bg-white/10 transition-[left] duration-[1700ms] ease-linear"} style={{ left: bottlePosition }}>
            <div className="absolute -top-2 left-3 h-2 w-4 rounded-t border-2 border-b-0 border-slate-100/90" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-cyan-200 to-cyan-500 transition-[height] duration-100" style={{ height: fillPercent + "%" }} />
          </div>
          <div className="absolute bottom-10 right-5 grid h-20 w-24 place-items-center rounded border-2 border-amber-900 bg-amber-700 text-center text-sm font-bold">Product<br />box</div>
          <p className="absolute bottom-4 left-5 text-xs text-slate-500">Tank → valve → bottle → packing</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#15151f] p-4">
          <div className="border-b border-white/10 pb-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">System controls</p>
            <button type="button" onClick={startSystem} disabled={!connected || running} className="mb-2 w-full rounded-md bg-emerald-700 px-4 py-3 font-bold transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Start system</button>
            <button type="button" onClick={stopSystem} disabled={!running} className="w-full rounded-md bg-red-700 px-4 py-3 font-bold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Stop system</button>
          </div>

          <div className="border-b border-white/10 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Operating mode</p>
            <div className="flex items-center justify-between rounded-md bg-black/25 p-3">
              <span className={autoMode ? "font-bold text-cyan-300" : "font-bold text-amber-300"}>{autoMode ? "Automatic (AUTO)" : "Manual"}</span>
              <button type="button" onClick={() => setAutoMode((mode) => !mode)} disabled={!connected} className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50">Switch</button>
            </div>
          </div>

          <div className="border-b border-white/10 py-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="fill-volume">Fill setting</label>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 p-3">
              <span className="text-sm">Target volume</span>
              <span className="flex items-center gap-2 text-cyan-300">
                <input id="fill-volume" type="number" min="0.5" max="5" step="0.5" value={targetLiters} onChange={(event) => setTargetLiters(Math.min(5, Math.max(0.5, Number(event.target.value) || 0.5)))} className="w-16 rounded border border-cyan-400/50 bg-slate-950 px-2 py-1 text-right font-mono outline-none" />
                L
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-white/10 bg-black/40 p-3 text-sm">
              <span>Currently filling</span><span className="font-mono font-bold text-emerald-300">{fillAmount.toFixed(2)} L</span>
            </div>
          </div>

          <div className="pt-4">
            <button type="button" onClick={() => setBottleState("filling")} disabled={!connected || !running || autoMode || !isAligned} className="w-full rounded-md bg-emerald-600 px-4 py-3 font-bold shadow-[0_0_18px_rgba(16,185,129,0.35)] transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none">● Fill shampoo</button>
            <div className="mt-4 rounded bg-black/25 p-3 text-center text-sm font-semibold text-slate-300">{status}</div>
            <p className="mt-3 text-center text-sm text-slate-400">Completed bottles: <span className="font-mono font-bold text-emerald-300">{completedBottles}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
