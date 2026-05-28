import React, { useState, useMemo } from 'react';
import { DrawingProgram, QCItem } from '../types';
import { collectSubgroups, calcSPCStats, cpkColor, cpkLabel, SubgroupPoint, SPCStats } from '../utils';
import { ArrowLeft, BarChart2, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface SPCAnalysisViewProps {
  program: DrawingProgram;
  onBack: () => void;
}

// ── SVG X-bar Control Chart ──────────────────────────────────────────────────
function XBarChart({ subgroups, stats }: { subgroups: SubgroupPoint[]; stats: SPCStats }) {
  const W = 760, H = 220, PAD = { top: 20, right: 24, bottom: 40, left: 58 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allY = [stats.uclXBar, stats.lclXBar, stats.usl, stats.lsl, ...subgroups.map(s => s.mean)];
  const yMin = Math.min(...allY) - (stats.usl - stats.lsl) * 0.15;
  const yMax = Math.max(...allY) + (stats.usl - stats.lsl) * 0.15;
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(subgroups.length - 1, 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH;

  const hLine = (y: number, color: string, dash = '', label = '', labelRight = '') => {
    const cy = toY(y);
    return (
      <g key={label + y}>
        <line x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy} stroke={color} strokeWidth={1.5} strokeDasharray={dash} opacity={0.85} />
        {label && <text x={PAD.left - 4} y={cy + 4} fill={color} fontSize={9} textAnchor="end" fontWeight="700">{label}</text>}
        {labelRight && <text x={W - PAD.right + 4} y={cy + 4} fill={color} fontSize={9} textAnchor="start" fontWeight="700">{labelRight}</text>}
      </g>
    );
  };

  const linePath = subgroups.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(s.mean)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const yv = yMin + t * yRange;
        return <line key={t} x1={PAD.left} y1={toY(yv)} x2={W - PAD.right} y2={toY(yv)} stroke="#1e293b" strokeWidth={1} />;
      })}
      {/* Spec limits */}
      {hLine(stats.usl, '#f97316', '5,3', 'USL')}
      {hLine(stats.lsl, '#f97316', '5,3', 'LSL')}
      {/* Control limits */}
      {hLine(stats.uclXBar, '#ef4444', '4,2', 'UCL')}
      {hLine(stats.lclXBar, '#ef4444', '4,2', 'LCL')}
      {/* Center line */}
      {hLine(stats.xBarMean, '#22c55e', '', 'CL')}
      {/* Line */}
      <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
      {/* Points */}
      {subgroups.map((s, i) => {
        const outOfControl = s.mean > stats.uclXBar || s.mean < stats.lclXBar;
        return (
          <g key={s.runId}>
            <circle cx={toX(i)} cy={toY(s.mean)} r={5} fill={outOfControl ? '#ef4444' : '#60a5fa'} stroke="#0f172a" strokeWidth={1.5} />
            <text x={toX(i)} y={H - PAD.bottom + 14} fill="#64748b" fontSize={7.5} textAnchor="middle">{s.lotNo || `#${i + 1}`}</text>
          </g>
        );
      })}
      {/* Y axis label */}
      <text x={12} y={H / 2} fill="#94a3b8" fontSize={9} textAnchor="middle" transform={`rotate(-90,12,${H / 2})`}>X-bar</text>
    </svg>
  );
}

// ── SVG Individual Chart ─────────────────────────────────────────────────────
function IndividualChart({ subgroups, stats }: { subgroups: SubgroupPoint[]; stats: SPCStats }) {
  const W = 760, H = 200, PAD = { top: 20, right: 24, bottom: 36, left: 58 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = subgroups.flatMap(s => s.values);
  const yMin = Math.min(stats.lsl, ...allVals) - (stats.usl - stats.lsl) * 0.12;
  const yMax = Math.max(stats.usl, ...allVals) + (stats.usl - stats.lsl) * 0.12;
  const yRange = yMax - yMin || 1;
  const totalPoints = allVals.length;

  const toX = (idx: number) => PAD.left + (idx / Math.max(totalPoints - 1, 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH;

  let globalIdx = 0;
  const dots: React.ReactNode[] = [];
  subgroups.forEach(sg => {
    sg.values.forEach(v => {
      const isNG = v > stats.usl || v < stats.lsl;
      dots.push(
        <circle key={`${sg.runId}-${globalIdx}`} cx={toX(globalIdx)} cy={toY(v)} r={3.5}
          fill={isNG ? '#ef4444' : '#a78bfa'} stroke="#0f172a" strokeWidth={1} />
      );
      globalIdx++;
    });
  });

  const linePath = (() => {
    let idx = 0;
    return subgroups.flatMap(sg => sg.values.map(v => {
      const p = `${idx === 0 ? 'M' : 'L'}${toX(idx)},${toY(v)}`;
      idx++;
      return p;
    })).join(' ');
  })();

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {[stats.usl, stats.lsl].map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#f97316" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8} />
          <text x={PAD.left - 4} y={toY(v) + 4} fill="#f97316" fontSize={9} textAnchor="end" fontWeight="700">{i === 0 ? 'USL' : 'LSL'}</text>
        </g>
      ))}
      <line x1={PAD.left} y1={toY(stats.mean)} x2={W - PAD.right} y2={toY(stats.mean)} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3,2" />
      <text x={PAD.left - 4} y={toY(stats.mean) + 4} fill="#22c55e" fontSize={9} textAnchor="end" fontWeight="700">X̄</text>
      <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeLinejoin="round" opacity={0.5} />
      {dots}
      <text x={12} y={H / 2} fill="#94a3b8" fontSize={9} textAnchor="middle" transform={`rotate(-90,12,${H / 2})`}>Cá nhân</text>
    </svg>
  );
}

// ── SVG Histogram ─────────────────────────────────────────────────────────────
function Histogram({ subgroups, stats }: { subgroups: SubgroupPoint[]; stats: SPCStats }) {
  const allVals = subgroups.flatMap(s => s.values);
  if (allVals.length < 2) return <div className="text-slate-500 text-xs text-center py-6">Cần ít nhất 2 giá trị</div>;

  const bins = 10;
  const W = 380, H = 200, PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const vMin = Math.min(...allVals, stats.lsl);
  const vMax = Math.max(...allVals, stats.usl);
  const binW = (vMax - vMin) / bins;

  const counts = Array(bins).fill(0);
  allVals.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - vMin) / binW));
    counts[idx]++;
  });
  const maxCount = Math.max(...counts);

  const toX = (v: number) => PAD.left + ((v - vMin) / (vMax - vMin)) * chartW;
  const barW = chartW / bins;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {counts.map((count, i) => {
        const barH = maxCount > 0 ? (count / maxCount) * chartH : 0;
        const bx = PAD.left + i * barW;
        const by = PAD.top + chartH - barH;
        const centerVal = vMin + (i + 0.5) * binW;
        const isOutside = centerVal < stats.lsl || centerVal > stats.usl;
        return (
          <rect key={i} x={bx + 1} y={by} width={barW - 2} height={barH}
            fill={isOutside ? '#ef444460' : '#6366f160'} stroke={isOutside ? '#ef4444' : '#6366f1'} strokeWidth={1} rx={1} />
        );
      })}
      {/* USL/LSL lines */}
      <line x1={toX(stats.usl)} y1={PAD.top} x2={toX(stats.usl)} y2={PAD.top + chartH} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,2" />
      <line x1={toX(stats.lsl)} y1={PAD.top} x2={toX(stats.lsl)} y2={PAD.top + chartH} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,2" />
      <line x1={toX(stats.mean)} y1={PAD.top} x2={toX(stats.mean)} y2={PAD.top + chartH} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3,2" />
      {/* X axis */}
      <line x1={PAD.left} y1={PAD.top + chartH} x2={W - PAD.right} y2={PAD.top + chartH} stroke="#334155" strokeWidth={1} />
      <text x={toX(stats.lsl)} y={H - 4} fill="#f97316" fontSize={7} textAnchor="middle">LSL</text>
      <text x={toX(stats.usl)} y={H - 4} fill="#f97316" fontSize={7} textAnchor="middle">USL</text>
      <text x={toX(stats.mean)} y={H - 4} fill="#22c55e" fontSize={7} textAnchor="middle">X̄</text>
    </svg>
  );
}

// ── Main SPC View ─────────────────────────────────────────────────────────────
export default function SPCAnalysisView({ program, onBack }: SPCAnalysisViewProps) {
  const numericalItems = program.qcItems.filter(i => i.isNumerical && i.minLimit !== undefined && i.maxLimit !== undefined);
  const [selectedItemId, setSelectedItemId] = useState<number>(numericalItems[0]?.id ?? -1);

  const selectedItem = numericalItems.find(i => i.id === selectedItemId) ?? null;

  const subgroups = useMemo(() => {
    if (!selectedItem) return [];
    return collectSubgroups(program.runs, selectedItem.id);
  }, [selectedItem, program.runs]);

  const stats = useMemo(() => {
    if (!selectedItem || subgroups.length === 0) return null;
    return calcSPCStats(subgroups, selectedItem.maxLimit!, selectedItem.minLimit!);
  }, [subgroups, selectedItem]);

  if (numericalItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-slate-950">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-slate-400 text-sm font-bold">Không có mốc đo số lượng nào để phân tích SPC</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
        </button>
      </div>
    );
  }

  const cpkVal = stats?.cpk ?? 0;
  const cpkClr = cpkColor(cpkVal);
  const cpkLbl = cpkLabel(cpkVal);

  const statCard = (label: string, value: string | number, sub?: string, color?: string) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1 items-center text-center">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-lg font-black font-mono" style={color ? { color } : { color: '#f1f5f9' }}>{value}</span>
      {sub && <span className="text-[9px] text-slate-500 font-bold">{sub}</span>}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-5 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <BarChart2 className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-black text-white">Phân tích SPC & CPK</span>
        <span className="text-[11px] text-slate-400 font-mono ml-1">— {program.partCode} · {program.programName}</span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">Mốc đo:</span>
          <select
            value={selectedItemId}
            onChange={e => setSelectedItemId(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {numericalItems.map(item => (
              <option key={item.id} value={item.id}>[{item.id}] {item.name} ({item.standard})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

        {/* Stat cards */}
        {stats ? (
          <>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
              {statCard('N (Mẫu)', stats.n)}
              {statCard('Lượt đo', stats.subgroups)}
              {statCard('Trung bình', stats.mean.toFixed(4))}
              {statCard('Sigma (σ)', stats.sigma.toFixed(4))}
              {statCard('Min', stats.min.toFixed(4))}
              {statCard('Max', stats.max.toFixed(4))}
              <div className="bg-slate-900 border-2 rounded-2xl p-3 flex flex-col gap-1 items-center text-center col-span-2" style={{ borderColor: cpkClr }}>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">CPK</span>
                <span className="text-2xl font-black font-mono" style={{ color: cpkClr }}>{cpkVal.toFixed(3)}</span>
                <span className="text-[9px] font-black" style={{ color: cpkClr }}>{cpkLbl}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {statCard('CP (Năng lực tiềm năng)', stats.cp.toFixed(3), 'Tol/(6σ)', stats.cp >= 1.33 ? '#22c55e' : '#f59e0b')}
              {statCard('CPU (Cận trên)', stats.cpu.toFixed(3), '(USL−X̄)/(3σ)', stats.cpu >= 1.33 ? '#22c55e' : '#f59e0b')}
              {statCard('CPL (Cận dưới)', stats.cpl.toFixed(3), '(X̄−LSL)/(3σ)', stats.cpl >= 1.33 ? '#22c55e' : '#f59e0b')}
            </div>

            {/* X-bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-white uppercase tracking-wide">X-bar Control Chart</span>
                <span className="text-[9px] text-slate-500 ml-1">— Giá trị trung bình mỗi lượt đo</span>
                <div className="ml-auto flex items-center gap-3 text-[9px] text-slate-400 font-bold">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" style={{ borderTop: '2px dashed #ef4444' }}></span>UCL/LCL</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded"></span>USL/LSL</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block rounded"></span>CL</span>
                </div>
              </div>
              <XBarChart subgroups={subgroups} stats={stats} />
            </div>

            {/* Individual Chart + Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-black text-white uppercase tracking-wide block mb-3">Individual Measurements Chart</span>
                <IndividualChart subgroups={subgroups} stats={stats} />
              </div>
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-black text-white uppercase tracking-wide block mb-3">Histogram Phân phối</span>
                <Histogram subgroups={subgroups} stats={stats} />
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-black text-white uppercase tracking-wide block mb-3">Bảng dữ liệu tổng hợp ({subgroups.length} lượt đo)</span>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left p-2 font-bold">#</th>
                      <th className="text-left p-2 font-bold">Lượt đo</th>
                      <th className="text-left p-2 font-bold">Ngày</th>
                      <th className="text-left p-2 font-bold">LOT</th>
                      <th className="text-center p-2 font-bold">Cav 1</th>
                      <th className="text-center p-2 font-bold">Cav 2</th>
                      <th className="text-center p-2 font-bold">Cav 3</th>
                      <th className="text-center p-2 font-bold">Cav 4</th>
                      <th className="text-center p-2 font-bold">X̄</th>
                      <th className="text-center p-2 font-bold">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subgroups.map((sg, i) => {
                      const outXBar = sg.mean > stats.uclXBar || sg.mean < stats.lclXBar;
                      return (
                        <tr key={sg.runId} className={`border-b border-slate-800/50 ${outXBar ? 'bg-red-950/20' : 'hover:bg-slate-800/30'}`}>
                          <td className="p-2 text-slate-500">{i + 1}</td>
                          <td className="p-2 text-slate-300 max-w-[140px] truncate">{sg.runName}</td>
                          <td className="p-2 text-slate-400">{sg.date}</td>
                          <td className="p-2 text-slate-400">{sg.lotNo || '-'}</td>
                          {[0, 1, 2, 3].map(ci => {
                            const v = sg.values[ci];
                            const isOut = v !== undefined && (v > stats.usl || v < stats.lsl);
                            return (
                              <td key={ci} className={`p-2 text-center font-bold ${isOut ? 'text-red-400' : 'text-white'}`}>
                                {v !== undefined ? v.toFixed(4) : <span className="text-slate-700">—</span>}
                              </td>
                            );
                          })}
                          <td className={`p-2 text-center font-black ${outXBar ? 'text-red-400' : 'text-blue-300'}`}>{sg.mean.toFixed(4)}</td>
                          <td className="p-2 text-center text-slate-400">{sg.range.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CPK Legend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-4 gap-3 text-center text-[10px]">
              {[
                { label: 'Xuất sắc', range: 'CPK ≥ 1.67', color: '#22c55e' },
                { label: 'Đạt', range: '1.33 ≤ CPK < 1.67', color: '#3b82f6' },
                { label: 'Cận biên', range: '1.00 ≤ CPK < 1.33', color: '#f59e0b' },
                { label: 'Không đạt', range: 'CPK < 1.00', color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="font-black" style={{ color: item.color }}>{item.label}</span>
                  <span className="text-slate-500 font-mono">{item.range}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <BarChart2 className="w-16 h-16 text-slate-700" />
            <p className="text-slate-500 font-bold text-sm">Chưa có dữ liệu đo lường cho mốc này</p>
            <p className="text-slate-600 text-xs">Hãy nhập ít nhất 1 giá trị đo trong các lượt đo trước khi phân tích</p>
          </div>
        )}
      </div>
    </div>
  );
}
