"use client";

import { useCallback, useEffect, useState } from "react";
import { ShampooScada } from "./shampoo-scada";
import {
  connectPlc,
  disconnectPlc,
  IO_POINT_COUNT,
  readIo,
  writeY,
  type PlcDeviceResponse,
} from "@/services/plcService";

function createEmptyIo(prefix: "X" | "Y"): PlcDeviceResponse[] {
  return Array.from({ length: IO_POINT_COUNT }, (_, index) => ({
    device: `${prefix}${index}`,
    value: 0,
  }));
}

function IoCard({
  device,
  value,
  kind,
  disabled,
  onToggle,
}: {
  device: string;
  value: number;
  kind: "input" | "output";
  disabled?: boolean;
  onToggle?: () => void;
}) {
  const isOn = value === 1;
  const isOutput = kind === "output";

  const content = (
    <>
      <span className="font-mono text-sm font-semibold text-slate-200">
        {device}
      </span>
      <span
        className={`mt-3 grid h-14 w-14 place-items-center rounded-2xl border text-xs font-black tracking-widest transition-all duration-300 ${
          isOn
            ? "border-emerald-300/30 bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.45)]"
            : "border-slate-700 bg-slate-800 text-slate-300 shadow-[inset_0_0_18px_rgba(0,0,0,0.45)]"
        }`}
      >
        {isOn ? "ON" : "OFF"}
      </span>
    </>
  );

  if (isOutput) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isOn}
        aria-label={`Toggle ${device}`}
        className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/30 hover:bg-cyan-500/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {content}
    </div>
  );
}

export default function Home() {
  const [xDevices, setXDevices] = useState(() => createEmptyIo("X"));
  const [yDevices, setYDevices] = useState(() => createEmptyIo("Y"));
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [writingDevice, setWritingDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIo = useCallback(async () => {
    try {
      const { x, y } = await readIo();
      setXDevices(x);
      setYDevices(y);
      setError(null);
    } catch (pollError) {
      setConnected(false);
      setXDevices(createEmptyIo("X"));
      setYDevices(createEmptyIo("Y"));
      setError(
        pollError instanceof Error ? pollError.message : "Unable to reach PLC",
      );
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;
    let timeoutId: number;

    async function poll() {
      await pollIo();
      if (!cancelled) timeoutId = window.setTimeout(poll, 1000);
    }

    timeoutId = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [connected, pollIo]);

  async function handleConnect() {
    if (isConnecting || connected) return;

    setIsConnecting(true);
    setError(null);

    try {
      await connectPlc();
      setConnected(true);
    } catch (connectError) {
      setConnected(false);
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to connect to GX Simulator",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (isConnecting || !connected) return;

    setIsConnecting(true);
    setError(null);

    try {
      await disconnectPlc();
      setConnected(false);
      setXDevices(createEmptyIo("X"));
      setYDevices(createEmptyIo("Y"));
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Unable to disconnect from PLC",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function toggleY(device: string) {
    if (writingDevice) return;

    const current = yDevices.find((entry) => entry.device === device);
    if (!current) return;

    const nextValue = current.value === 1 ? 0 : 1;
    setYDevices((previous) =>
      previous.map((entry) =>
        entry.device === device ? { ...entry, value: nextValue } : entry,
      ),
    );
    setWritingDevice(device);

    try {
      await writeY(device, nextValue);
      setError(null);
    } catch (writeError) {
      setYDevices((previous) =>
        previous.map((entry) =>
          entry.device === device ? { ...entry, value: current.value } : entry,
        ),
      );
      setError(
        writeError instanceof Error
          ? writeError.message
          : `Unable to write ${device}`,
      );
    } finally {
      setWritingDevice(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-5 py-8 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
              Factory automation
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              FX5U Control Center
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Mitsubishi PLC · Logical station 1 · X0–X7 / Y0–Y7
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected
                    ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
                    : "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                }`}
              />
              <span className="font-medium">
                {connected ? "GX Simulator connected" : "Not connected"}
              </span>
            </div>

            {connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-70"
              >
                {isConnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-wait disabled:opacity-70"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <ShampooScada connected={connected} />

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 shadow-2xl shadow-black/30">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Digital inputs
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">X Devices</h2>
                </div>
                <span className="rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-slate-400">
                  1s POLL
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {xDevices.map((entry) => (
                  <IoCard
                    key={entry.device}
                    device={entry.device}
                    value={entry.value}
                    kind="input"
                  />
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                Live status from{" "}
                <span className="font-mono text-cyan-300">X0–X7</span>
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 shadow-2xl shadow-black/30">
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Digital outputs
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">Y Devices</h2>
                </div>
                <span className="rounded-lg bg-white/5 px-3 py-1 font-mono text-xs text-slate-400">
                  CLICK TO WRITE
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {yDevices.map((entry) => (
                  <IoCard
                    key={entry.device}
                    device={entry.device}
                    value={entry.value}
                    kind="output"
                    disabled={
                      !connected || writingDevice === entry.device
                    }
                    onToggle={() => toggleY(entry.device)}
                  />
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-slate-400">
                Click any output to toggle{" "}
                <span className="font-mono text-violet-300">Y0–Y7</span>
              </p>
            </div>
          </article>
        </section>

        <footer className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs text-slate-500">
          <span>MX Component Gateway</span>
          <span className="font-mono">127.0.0.1:5000</span>
        </footer>
      </div>
    </main>
  );
}
