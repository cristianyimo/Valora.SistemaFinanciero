import { AlertTriangle } from 'lucide-react'
import { calcularPunitorio, punitorioTotal } from '../../lib/finanzas'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const INTERVALOS_PUNITORIO = [1, 2, 3, 5, 7, 10, 15, 30]

/**
 * Permite elegir si se aplica punitorio a las cuotas vencidas y configurar
 * la tasa (%) y cada cuántos días se aplica.
 * config: { aplicar: bool, tasa: number, cadaDias: number }
 */
export default function CalculadoraPunitorio({ cuotasVencidas = [], config, setConfig }) {
  if (cuotasVencidas.length === 0) return null

  const total = config.aplicar ? punitorioTotal(cuotasVencidas, config.tasa, config.cadaDias) : 0

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold">
            {cuotasVencidas.length === 1
              ? `Cuota ${cuotasVencidas[0].numeroCuota} vencida hace ${cuotasVencidas[0].diasAtraso} ${cuotasVencidas[0].diasAtraso === 1 ? 'día' : 'días'}`
              : `${cuotasVencidas.length} cuotas vencidas`}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.aplicar}
            onChange={(e) => setConfig((c) => ({ ...c, aplicar: e.target.checked }))}
            className="w-4 h-4 accent-red-600 cursor-pointer"
          />
          Aplicar punitorio
        </label>
      </div>

      {config.aplicar && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tasa (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={config.tasa}
                onChange={(e) => setConfig((c) => ({ ...c, tasa: e.target.value }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Se aplica cada</label>
              <select
                value={config.cadaDias}
                onChange={(e) => setConfig((c) => ({ ...c, cadaDias: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {INTERVALOS_PUNITORIO.map((d) => (
                  <option key={d} value={d}>{d === 1 ? '1 día' : `${d} días`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-slate-600">
            {cuotasVencidas.map((c) => {
              const periodos = Math.floor(c.diasAtraso / Math.max(1, Number(config.cadaDias) || 1))
              return (
                <div key={c.numeroCuota} className="flex justify-between gap-2">
                  <span>
                    Cuota {c.numeroCuota}: ${fmt(c.restante)} × {Number(config.tasa) || 0}% × {periodos} {periodos === 1 ? 'período' : 'períodos'} ({c.diasAtraso} días)
                  </span>
                  <span className="font-bold text-slate-800">${fmt(calcularPunitorio(c.restante, c.diasAtraso, config.tasa, config.cadaDias))}</span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-red-200">
            <span className="text-xs font-bold text-red-800">Punitorio a cobrar</span>
            <span className="text-base font-bold text-red-700">${fmt(total)}</span>
          </div>
        </>
      )}
    </div>
  )
}
