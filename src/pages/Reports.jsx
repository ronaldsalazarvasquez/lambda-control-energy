import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Download, Printer, FileSpreadsheet } from 'lucide-react'
import { useStore, useMinute } from '../store'
import { Card, Segmented } from '../components/ui'
import { BarPanel } from '../components/widgets'
import { stats, windowFor, tonsRange, fmt, RANGES, pfAt, mainMeter } from '../lib/sim'

export default function Reports() {
  const minute = useMinute()
  const { meters, areas, plant, toast } = useStore()
  const [range, setRange] = useState('7d')
  const [group, setGroup] = useState('area')

  const rep = useMemo(() => {
    const [s, e] = windowFor(range)
    const tons = tonsRange(s, e)
    const main = stats(mainMeter(), s, e)
    const units = group === 'area'
      ? areas.map((a) => ({ name: a.name, color: a.color, ms: meters.filter((m) => m.areaId === a.id) }))
      : meters.filter((m) => !m.isMain).map((m) => ({ name: `${m.id} ${m.name}`, color: areas.find((a) => a.id === m.areaId)?.color || '#64748b', ms: [m] }))
    const rows = units.map((u) => {
      const ss = u.ms.map((m) => stats(m, s, e))
      const energy = ss.reduce((a, x) => a + x.energy, 0)
      return { ...u, energy, energyHP: ss.reduce((a, x) => a + x.energyHP, 0), maxKw: ss.reduce((a, x) => a + x.maxKw, 0), cost: ss.reduce((a, x) => a + x.cost, 0), costHP: ss.reduce((a, x) => a + x.costHP, 0), pf: u.ms.length ? u.ms.reduce((a, m) => a + pfAt(m), 0) / u.ms.length : 0, kwht: tons ? energy / tons : 0 }
    }).filter((r) => r.ms.length)
    const sum = rows.reduce((a, r) => a + r.energy, 0)
    return { rows, sum, tons, main, losses: main.energy - sum }
  }, [range, group, meters, areas, minute]) // eslint-disable-line

  const csv = () => {
    const head = ['Unidad', 'Energía kWh', 'Energía HP kWh', '% total', 'Demanda máx kW', 'FP', 'Costo HP S/', 'Costo total S/', 'kWh/t']
    const lines = rep.rows.map((r) => [r.name, r.energy.toFixed(1), r.energyHP.toFixed(1), ((r.energy / rep.sum) * 100).toFixed(1), r.maxKw.toFixed(1), r.pf.toFixed(3), r.costHP.toFixed(2), r.cost.toFixed(2), r.kwht.toFixed(2)].join(';'))
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reporte-energia-${range}.csv`; a.click()
    toast('Reporte exportado a CSV')
  }

  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Reporte energético</h2><p className="muted">{plant.name} · {RANGES[range].label} · tarifa HP S/ {plant.tariffHP} / FP S/ {plant.tariffFP} por kWh</p></div>
        <div className="row gap8 wrap no-print">
          <Segmented size="sm" value={range} onChange={setRange} options={['today', '7d', 'month', '30d'].map((k) => ({ value: k, label: RANGES[k].label }))} />
          <button className="btn ghost" onClick={csv}><FileSpreadsheet size={15} /> Excel (CSV)</button>
          <button className="btn primary" onClick={() => window.print()}><Printer size={15} /> Imprimir / PDF</button>
        </div>
      </div>
      <div className="kpis">
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Energía total (MED-001)</span><div className="kpi-v">{fmt(rep.main.energy, 0)}<small> kWh</small></div></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Costo total</span><div className="kpi-v"><small>S/ </small>{fmt(rep.main.cost, 2)}</div><span className="muted xs">Hora punta S/ {fmt(rep.main.costHP, 2)} ({fmt((rep.main.costHP / (rep.main.cost || 1)) * 100, 0)}%)</span></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Producción paddy</span><div className="kpi-v">{fmt(rep.tons, 0)}<small> t</small></div></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Consumo específico</span><div className="kpi-v">{fmt(rep.main.energy / (rep.tons || 1), 1)}<small> kWh/t</small></div><span className="muted xs">Meta {plant.targetKwht} kWh/t</span></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Pérdidas / no medido</span><div className="kpi-v">{fmt(rep.losses, 0)}<small> kWh</small></div><span className="muted xs">{fmt((rep.losses / (rep.main.energy || 1)) * 100, 1)}% del total</span></div></div>
      </div>
      <div className="grid g-2">
        <Card title={`Energía por ${group === 'area' ? 'área' : 'medidor'}`} actions={<Segmented size="sm" value={group} onChange={setGroup} options={[{ value: 'area', label: 'Áreas' }, { value: 'meter', label: 'Medidores' }]} />}>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={rep.rows} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v) => `${fmt(v, 0)} kWh`} />
                <Bar dataKey="energy" radius={[0, 6, 6, 0]} isAnimationActive={false}>{rep.rows.map((r) => <Cell key={r.name} fill={r.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Evolución diaria"><div style={{ height: 300 }}><BarPanel config={{ metric: 'energy', meterIds: meters.filter((m) => !m.isMain).map((m) => m.id) }} range={range === 'today' ? '7d' : range} gran="day" /></div></Card>
      </div>
      <Card title="Detalle" actions={<button className="btn ghost sm no-print" onClick={csv}><Download size={14} /> CSV</button>}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{group === 'area' ? 'Área' : 'Medidor'}</th><th className="r">Energía kWh</th><th className="r">% total</th><th className="r">Energía HP</th><th className="r">Demanda máx kW</th><th className="r">FP prom.</th><th className="r">Costo HP S/</th><th className="r">Costo total S/</th><th className="r">kWh/t</th></tr></thead>
            <tbody>
              {rep.rows.map((r) => (
                <tr key={r.name}>
                  <td><span className="row gap6"><i className="sw" style={{ background: r.color }} />{r.name}</span></td>
                  <td className="r num">{fmt(r.energy, 0)}</td>
                  <td className="r num"><div className="pct"><i style={{ width: `${(r.energy / rep.sum) * 100}%`, background: r.color }} />{fmt((r.energy / rep.sum) * 100, 1)}%</div></td>
                  <td className="r num">{fmt(r.energyHP, 0)}</td>
                  <td className="r num">{fmt(r.maxKw, 1)}</td>
                  <td className={`r num ${r.pf < 0.9 ? 't-red' : ''}`}>{fmt(r.pf, 2)}</td>
                  <td className="r num">{fmt(r.costHP, 2)}</td>
                  <td className="r num"><b>{fmt(r.cost, 2)}</b></td>
                  <td className="r num">{fmt(r.kwht, 2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td><b>Total medido</b></td><td className="r num"><b>{fmt(rep.sum, 0)}</b></td><td className="r">100%</td><td className="r num">{fmt(rep.rows.reduce((a, r) => a + r.energyHP, 0), 0)}</td><td /><td /><td className="r num">{fmt(rep.rows.reduce((a, r) => a + r.costHP, 0), 2)}</td><td className="r num"><b>{fmt(rep.rows.reduce((a, r) => a + r.cost, 0), 2)}</b></td><td className="r num">{fmt(rep.sum / (rep.tons || 1), 2)}</td></tr></tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
