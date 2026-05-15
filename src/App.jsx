import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sun, Moon, Cloud, AlertTriangle, Flame, Cable, Home, Battery, Gauge, ShieldCheck, RotateCcw, CheckCircle2, XCircle, Info, PlugZap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COMPONENTS = [
  { id: "pv", label: "Panel Solar", type: "DC Source", detail: "PV Array 6.2 kWp, Voc ~225V/string, Imp ~13A" },
  { id: "mc4", label: "MC4 Connector", type: "Connector", detail: "Connector DC untuk kabel solar. Polariti mesti betul." },
  { id: "pvCable", label: "Kabel PV DC", type: "Cable", detail: "PV1-F / H1Z2Z2-K, 4mm² / 6mm², UV resistant" },
  { id: "combiner", label: "DC Combiner", type: "Protection", detail: "DC fuse + DC SPD Type 2 + string protection" },
  { id: "dcIso", label: "DC Isolator", type: "Safety", detail: "Pemutus DC sebelum inverter" },
  { id: "inverter", label: "Hybrid Inverter", type: "Converter", detail: "MPPT, DC ke AC, anti-islanding, backup output" },
  { id: "battery", label: "Bateri LiFePO4", type: "Storage", detail: "51.2V, BMS, CAN/RS485, breaker/fuse" },
  { id: "mainDB", label: "Main DB", type: "AC Distribution", detail: "AC MCB/MCCB, RCCB/RCBO, AC SPD" },
  { id: "backupDB", label: "Backup Load DB", type: "Essential Load", detail: "Lampu, Wi-Fi, peti sejuk, CCTV, TV kecil" },
  { id: "meter", label: "Meter Dua Hala", type: "Grid Meter", detail: "Import/export ke grid TNB" },
  { id: "grid", label: "Grid TNB", type: "Utility", detail: "Bekalan utiliti dan eksport lebihan tenaga" },
  { id: "earth", label: "Grounding & SPD", type: "Safety", detail: "Earth bar, earth rod, bonding frame panel, SPD grounding" },
];

const REQUIRED_CONNECTIONS = [
  ["pv", "mc4"],
  ["mc4", "pvCable"],
  ["pvCable", "combiner"],
  ["combiner", "dcIso"],
  ["dcIso", "inverter"],
  ["inverter", "mainDB"],
  ["mainDB", "backupDB"],
  ["mainDB", "meter"],
  ["meter", "grid"],
  ["battery", "inverter"],
  ["earth", "combiner"],
  ["earth", "inverter"],
  ["earth", "mainDB"],
];

const WRONG_PATTERNS = [
  { from: "pv", to: "mainDB", severity: "critical", effect: "DC masuk terus ke DB AC. Risiko breaker trip, peralatan rosak dan kebakaran." },
  { from: "pv", to: "grid", severity: "critical", effect: "PV disambung terus ke grid tanpa inverter. Sangat berbahaya dan tidak sah." },
  { from: "battery", to: "mainDB", severity: "critical", effect: "Bateri DC masuk terus ke beban AC. Risiko letupan peralatan dan arus tinggi." },
  { from: "grid", to: "backupDB", severity: "danger", effect: "Backup DB bypass perlindungan inverter. Risiko backfeed semasa blackout." },
  { from: "inverter", to: "grid", severity: "danger", effect: "Inverter bypass meter/DB. Risiko anti-islanding gagal dan export tidak terkawal." },
  { from: "mc4", to: "inverter", severity: "warning", effect: "Kabel/protection DC dipintas. Risiko surge dan tiada fuse/string protection." },
  { from: "pvCable", to: "dcIso", severity: "warning", effect: "Combiner/SPD dipintas. Sistem boleh hidup, tapi perlindungan surge/fuse lemah." },
  { from: "combiner", to: "inverter", severity: "warning", effect: "DC isolator dipintas. Sukar putuskan DC semasa kecemasan/maintenance." },
  { from: "earth", to: "grid", severity: "warning", effect: "Grounding salah konsep. Earth perlu ke earth bar/rod dan body equipment, bukan direct grid path." },
];

const LOADS = [
  { name: "Lampu LED", watts: 100, backup: true },
  { name: "Wi‑Fi Router", watts: 20, backup: true },
  { name: "Peti Sejuk", watts: 150, backup: true },
  { name: "CCTV", watts: 40, backup: true },
  { name: "TV Kecil", watts: 120, backup: true },
  { name: "Kipas", watts: 180, backup: true },
  { name: "Aircond 1HP", watts: 900, backup: false },
  { name: "Mesin Basuh", watts: 500, backup: false },
  { name: "Cerek Elektrik", watts: 1800, backup: false },
  { name: "EV Charger", watts: 3200, backup: false },
];

const pairKey = (a, b) => `${a}->${b}`;
const pairMatches = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);

function getConnectionIssue(from, to) {
  return WRONG_PATTERNS.find((p) => pairMatches(from, to, p.from, p.to));
}

function isRequiredConnection(from, to) {
  return REQUIRED_CONNECTIONS.some(([a, b]) => pairMatches(from, to, a, b));
}

function componentById(id) {
  return COMPONENTS.find((c) => c.id === id);
}

function getNodePosition(id) {
  const map = {
    pv: "left-[4%] top-[8%]",
    mc4: "left-[16%] top-[25%]",
    pvCable: "left-[4%] top-[40%]",
    combiner: "left-[28%] top-[33%]",
    dcIso: "left-[43%] top-[22%]",
    inverter: "left-[48%] top-[43%]",
    battery: "left-[31%] top-[66%]",
    mainDB: "left-[67%] top-[31%]",
    backupDB: "left-[68%] top-[61%]",
    meter: "left-[82%] top-[55%]",
    grid: "left-[88%] top-[77%]",
    earth: "left-[7%] top-[73%]",
  };
  return map[id] || "left-0 top-0";
}

function getConnectionStyle(from, to) {
  const ids = [from, to];
  if (ids.includes("earth")) return "border-dashed border-slate-500 bg-slate-200";
  if (ids.includes("grid") || ids.includes("meter")) return "border-dashed border-orange-500 bg-orange-200";
  if (["pv", "mc4", "pvCable", "combiner", "dcIso", "battery", "inverter"].includes(from) && ["pv", "mc4", "pvCable", "combiner", "dcIso", "battery", "inverter"].includes(to)) return "bg-emerald-500";
  return "bg-blue-500";
}

function severityUi(severity) {
  if (severity === "critical") return { icon: Flame, label: "KRITIKAL", cls: "bg-red-100 text-red-800 border-red-300" };
  if (severity === "danger") return { icon: AlertTriangle, label: "BAHAYA", cls: "bg-orange-100 text-orange-800 border-orange-300" };
  return { icon: AlertTriangle, label: "AMARAN", cls: "bg-yellow-100 text-yellow-800 border-yellow-300" };
}

export default function TechnicalSolarHomeSimulation() {
  const [energyKwh, setEnergyKwh] = useState(24);
  const [sunHours, setSunHours] = useState(4.5);
  const [systemKwp, setSystemKwp] = useState(6.2);
  const [batteryKwh, setBatteryKwh] = useState(5);
  const [mode, setMode] = useState("day");
  const [connections, setConnections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [eventLog, setEventLog] = useState([
    { type: "info", text: "Klik dua komponen untuk sambungkan kabel. Lengkapkan wiring yang betul untuk hidupkan rumah." },
  ]);

  const requiredDone = useMemo(() => REQUIRED_CONNECTIONS.filter(([a, b]) => connections.some((c) => pairMatches(c.from, c.to, a, b))).length, [connections]);
  const wrongConnections = useMemo(() => connections.filter((c) => c.issue), [connections]);
  const criticalCount = wrongConnections.filter((c) => c.issue.severity === "critical").length;
  const warningCount = wrongConnections.filter((c) => c.issue.severity !== "critical").length;

  const loadDemandKw = useMemo(() => LOADS.reduce((sum, l) => sum + l.watts, 0) / 1000, []);
  const backupDemandKw = useMemo(() => LOADS.filter((l) => l.backup).reduce((sum, l) => sum + l.watts, 0) / 1000, []);

  const solarRequiredKwp = useMemo(() => Number(energyKwh) / Math.max(Number(sunHours), 0.1), [energyKwh, sunHours]);
  const estimatedDailyYield = useMemo(() => Number(systemKwp) * Number(sunHours) * 0.78, [systemKwp, sunHours]);
  const solarAdequacy = estimatedDailyYield >= Number(energyKwh);

  const hasFullPath = requiredDone === REQUIRED_CONNECTIONS.length && wrongConnections.length === 0;
  const hasBackupPath = [
    ["battery", "inverter"],
    ["inverter", "mainDB"],
    ["mainDB", "backupDB"],
  ].every(([a, b]) => connections.some((c) => pairMatches(c.from, c.to, a, b)));

  const houseStatus = useMemo(() => {
    if (criticalCount > 0) return { label: "SISTEM GAGAL", cls: "bg-red-600", description: "Ada sambungan kritikal. Simulasi menunjukkan risiko kerosakan besar." };
    if (!hasFullPath) return { label: "BELUM LENGKAP", cls: "bg-slate-700", description: "Wiring belum cukup untuk sistem operasi penuh." };
    if (mode === "blackout") {
      if (hasBackupPath && batteryKwh > 0) return { label: "BACKUP HIDUP", cls: "bg-amber-600", description: "Grid terputus. Hanya beban Backup DB dibekalkan bateri." };
      return { label: "ELEKTRIK TERPUTUS", cls: "bg-red-700", description: "Tiada backup path/bateri. Rumah tidak menerima bekalan." };
    }
    if (!solarAdequacy && mode === "day") return { label: "HIDUP + IMPORT GRID", cls: "bg-blue-700", description: "Solar kurang daripada penggunaan harian. Grid bantu bekalkan tenaga." };
    if (mode === "night") return { label: "HIDUP: BATERI/GRID", cls: "bg-indigo-700", description: "Malam tiada PV. Beban dibekalkan bateri dahulu, kemudian grid." };
    if (mode === "cloudy") return { label: "HIDUP: OUTPUT RENDAH", cls: "bg-sky-700", description: "Hari mendung. Output PV rendah dan mungkin import dari grid." };
    return { label: "RUMAH ADA POWER", cls: "bg-emerald-700", description: "Sambungan lengkap dan sistem beroperasi normal." };
  }, [criticalCount, hasFullPath, mode, hasBackupPath, batteryKwh, solarAdequacy]);

  const addLog = (entry) => setEventLog((prev) => [entry, ...prev].slice(0, 6));

  const handleNodeClick = (id) => {
    if (!selected) {
      setSelected(id);
      addLog({ type: "info", text: `Dipilih: ${componentById(id).label}. Pilih komponen kedua untuk sambungan.` });
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }
    const exists = connections.some((c) => pairMatches(c.from, c.to, selected, id));
    if (exists) {
      setConnections((prev) => prev.filter((c) => !pairMatches(c.from, c.to, selected, id)));
      addLog({ type: "info", text: `Sambungan ${componentById(selected).label} ↔ ${componentById(id).label} dibuang.` });
      setSelected(null);
      return;
    }
    const issue = getConnectionIssue(selected, id);
    const correct = isRequiredConnection(selected, id);
    const newConn = { from: selected, to: id, issue: issue || null, correct };
    setConnections((prev) => [...prev, newConn]);
    if (issue) {
      addLog({ type: issue.severity, text: `${componentById(selected).label} ↔ ${componentById(id).label}: ${issue.effect}` });
    } else if (correct) {
      addLog({ type: "success", text: `Betul: ${componentById(selected).label} ↔ ${componentById(id).label}` });
    } else {
      addLog({ type: "warning", text: `Sambungan tidak kritikal tetapi tidak diperlukan dalam reka bentuk ini: ${componentById(selected).label} ↔ ${componentById(id).label}` });
    }
    setSelected(null);
  };

  const reset = () => {
    setConnections([]);
    setSelected(null);
    setEventLog([{ type: "info", text: "Simulasi direset. Sambungkan semula komponen mengikut urutan teknikal." }]);
  };

  const autoCorrect = () => {
    setConnections(REQUIRED_CONNECTIONS.map(([from, to]) => ({ from, to, correct: true, issue: null })));
    setSelected(null);
    setEventLog([{ type: "success", text: "Wiring contoh lengkap dimasukkan. Kaji aliran DC, AC, grounding dan backup path." }]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-3xl bg-white shadow-sm border p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-sm font-medium mb-3">
                <PlugZap className="w-4 h-4" /> Web Simulation Learning Lab
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-950">Simulasi Teknikal Sistem Solar Rumah</h1>
              <p className="text-slate-600 mt-2 max-w-3xl">Masukkan penggunaan tenaga, sambungkan komponen dengan betul, dan lihat kesan teknikal jika wiring salah.</p>
            </div>
            <div className={`rounded-2xl ${houseStatus.cls} text-white p-4 min-w-[260px] shadow-sm`}>
              <div className="text-sm opacity-90">Status Rumah</div>
              <div className="text-2xl font-bold">{houseStatus.label}</div>
              <div className="text-sm mt-1 opacity-95">{houseStatus.description}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <aside className="space-y-4">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-bold text-xl flex items-center gap-2"><Gauge className="w-5 h-5" /> Input Tenaga</h2>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Penggunaan harian rumah (kWh/hari)</span>
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" type="number" min="1" step="1" value={energyKwh} onChange={(e) => setEnergyKwh(Number(e.target.value))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Peak sun hours</span>
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" type="number" min="1" step="0.1" value={sunHours} onChange={(e) => setSunHours(Number(e.target.value))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Saiz sistem solar (kWp)</span>
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" type="number" min="0.5" step="0.1" value={systemKwp} onChange={(e) => setSystemKwp(Number(e.target.value))} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Kapasiti bateri (kWh)</span>
                    <input className="mt-1 w-full rounded-xl border px-3 py-2" type="number" min="0" step="0.5" value={batteryKwh} onChange={(e) => setBatteryKwh(Number(e.target.value))} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-slate-50 border p-3">
                    <div className="text-slate-500">Solar diperlukan</div>
                    <div className="text-xl font-bold">{solarRequiredKwp.toFixed(1)} kWp</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border p-3">
                    <div className="text-slate-500">Yield anggaran</div>
                    <div className="text-xl font-bold">{estimatedDailyYield.toFixed(1)} kWh</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border p-3">
                    <div className="text-slate-500">Beban penuh</div>
                    <div className="text-xl font-bold">{loadDemandKw.toFixed(2)} kW</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border p-3">
                    <div className="text-slate-500">Backup load</div>
                    <div className="text-xl font-bold">{backupDemandKw.toFixed(2)} kW</div>
                  </div>
                </div>
                {!solarAdequacy && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" /> Sistem solar sekarang mungkin kurang untuk penggunaan harian. Grid atau bateri tambahan diperlukan.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h2 className="font-bold text-xl">Mod Operasi</h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "day", label: "Siang", icon: Sun },
                    { id: "night", label: "Malam", icon: Moon },
                    { id: "blackout", label: "Blackout", icon: AlertTriangle },
                    { id: "cloudy", label: "Mendung", icon: Cloud },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-2xl border p-3 text-left flex items-center gap-2 transition ${mode === m.id ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}>
                        <Icon className="w-5 h-5" /> <span className="font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={autoCorrect} className="rounded-2xl flex-1"><CheckCircle2 className="w-4 h-4 mr-2" /> Auto Betul</Button>
                  <Button onClick={reset} variant="outline" className="rounded-2xl"><RotateCcw className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h2 className="font-bold text-xl flex items-center gap-2"><Info className="w-5 h-5" /> Objektif Wiring</h2>
                <div className="text-sm text-slate-600">Lengkapkan {REQUIRED_CONNECTIONS.length} sambungan wajib. Klik komponen pertama, kemudian klik komponen kedua.</div>
                <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(requiredDone / REQUIRED_CONNECTIONS.length) * 100}%` }} />
                </div>
                <div className="text-sm font-medium">{requiredDone}/{REQUIRED_CONNECTIONS.length} sambungan wajib siap</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-red-800">Kritikal: {criticalCount}</div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-800">Amaran: {warningCount}</div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <Card className="rounded-3xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-white p-4 border-b flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-xl">Papan Simulasi Wiring</h2>
                    <p className="text-sm text-slate-600">Green = DC, Blue = AC, Orange dashed = Grid import/export, Gray dashed = grounding/communication.</p>
                  </div>
                  {selected && <div className="rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 text-sm">Dipilih: {componentById(selected).label}</div>}
                </div>

                <div className="relative h-[720px] bg-gradient-to-br from-sky-50 via-white to-emerald-50 overflow-hidden">
                  <div className="absolute left-[6%] top-[3%]"><Sun className="w-16 h-16 text-yellow-500" /></div>
                  <div className="absolute left-[35%] top-[7%] w-[260px] h-[96px] bg-slate-800 rounded-t-3xl rotate-0 shadow-lg">
                    <div className="grid grid-cols-5 gap-1 p-3">
                      {Array.from({ length: 15 }).map((_, i) => <div key={i} className="h-5 rounded bg-blue-800 border border-blue-300" />)}
                    </div>
                  </div>
                  <div className="absolute left-[37%] top-[18%] w-[340px] h-[250px] bg-white border-4 border-slate-300 shadow-md" style={{ clipPath: "polygon(0 20%, 50% 0, 100% 20%, 100% 100%, 0 100%)" }} />
                  <div className="absolute left-[47%] top-[36%]"><Home className="w-24 h-24 text-slate-300" /></div>

                  {connections.map((c, idx) => {
                    const fromPos = getNodePosition(c.from);
                    const toPos = getNodePosition(c.to);
                    return <ConnectionLine key={`${c.from}-${c.to}-${idx}`} from={c.from} to={c.to} issue={c.issue} cls={getConnectionStyle(c.from, c.to)} />;
                  })}

                  {COMPONENTS.map((node) => {
                    const isSelected = selected === node.id;
                    return (
                      <button key={node.id} onClick={() => handleNodeClick(node.id)} className={`absolute ${getNodePosition(node.id)} z-20 w-[150px] rounded-2xl border bg-white/95 p-3 text-left shadow-sm transition hover:scale-[1.03] ${isSelected ? "ring-4 ring-blue-300 border-blue-500" : "hover:shadow-md"}`}>
                        <div className="text-xs font-semibold text-slate-500">{node.type}</div>
                        <div className="font-bold text-sm leading-tight">{node.label}</div>
                        <div className="text-[11px] text-slate-600 mt-1 leading-snug">{node.detail}</div>
                      </button>
                    );
                  })}

                  <AnimatePresence>
                    {criticalCount > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/30 z-30 flex items-center justify-center pointer-events-none">
                        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="rounded-3xl bg-white border-4 border-red-500 p-6 text-center max-w-md shadow-2xl">
                          <Flame className="w-16 h-16 text-red-600 mx-auto" />
                          <div className="text-3xl font-black text-red-700 mt-2">SIMULASI KEROSAKAN</div>
                          <p className="text-slate-700 mt-2">Sambungan kritikal dikesan. Dalam dunia sebenar, ini boleh menyebabkan breaker trip, peralatan rosak, arcing atau kebakaran.</p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="rounded-3xl shadow-sm lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="font-bold text-xl mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Event Log</h2>
                  <div className="space-y-2">
                    {eventLog.map((log, idx) => {
                      const cls = log.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : log.type === "critical" ? "bg-red-50 border-red-200 text-red-900" : log.type === "danger" ? "bg-orange-50 border-orange-200 text-orange-900" : log.type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-900" : "bg-slate-50 border-slate-200 text-slate-800";
                      return <div key={idx} className={`rounded-2xl border p-3 text-sm ${cls}`}>{log.text}</div>;
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-bold text-xl flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Skor Keselamatan</h2>
                  <div className="text-5xl font-black">{Math.max(0, Math.round((requiredDone / REQUIRED_CONNECTIONS.length) * 100 - criticalCount * 35 - warningCount * 10))}%</div>
                  <div className="text-sm text-slate-600">Skor turun jika ada sambungan salah, perlindungan dipintas, atau grounding tidak lengkap.</div>
                  <div className="rounded-2xl bg-slate-50 border p-3 text-sm space-y-1">
                    <div><b>Rule penting:</b></div>
                    <div>PV DC mesti melalui MC4 → kabel PV → combiner/protection → DC isolator → inverter.</div>
                    <div>AC rumah mesti keluar dari inverter ke Main DB, bukan terus dari panel/bateri.</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-5">
                <h2 className="font-bold text-xl mb-3">Senarai Beban Rumah</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {LOADS.map((load) => (
                    <div key={load.name} className={`rounded-2xl border p-3 ${load.backup ? "bg-blue-50 border-blue-200" : "bg-slate-50"}`}>
                      <div className="font-semibold text-sm">{load.name}</div>
                      <div className="text-xl font-bold">{load.watts}W</div>
                      <div className="text-xs text-slate-600">{load.backup ? "Backup DB" : "Main DB"}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}

function ConnectionLine({ from, to, issue, cls }) {
  const coords = {
    pv: [10, 16], mc4: [22, 32], pvCable: [10, 47], combiner: [34, 40], dcIso: [49, 29], inverter: [55, 50], battery: [38, 73], mainDB: [74, 38], backupDB: [75, 68], meter: [88, 62], grid: [94, 84], earth: [13, 80],
  };
  const [x1, y1] = coords[from];
  const [x2, y2] = coords[to];
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const length = Math.sqrt(width * width + height * height);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const lineColor = issue ? "bg-red-600" : cls;

  return (
    <div className="absolute z-10 pointer-events-none" style={{ left: `${x1}%`, top: `${y1}%`, width: `${length}%`, transform: `rotate(${angle}deg)`, transformOrigin: "0 0" }}>
      <div className={`h-1.5 rounded-full shadow ${lineColor} ${cls.includes("dashed") ? "border-t-4 bg-transparent" : ""}`} />
      {issue && <XCircle className="absolute -top-3 left-1/2 w-7 h-7 text-red-700 bg-white rounded-full" />}
    </div>
  );
}
