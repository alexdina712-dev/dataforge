import type { ChartData } from '../lib/types';
import { formatNumber } from '../lib/operations';
export function Chart({ chart }: { chart: ChartData }) {
  const data = chart.data,
    W = 800,
    H = 330,
    left = 65,
    right = 25,
    top = 25,
    bottom = 70,
    w = W - left - right,
    h = H - top - bottom;
  const values = data.map((d) => d.y);
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values),
    scaleY = (y: number) => top + h - ((y - min) / (max - min)) * h;
  const numericX = chart.kind === 'scatter';
  const xs = data.map((d) => Number(d.x));
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  const scaleX = (i: number) =>
    numericX
      ? left + ((xs[i] - xmin) / (xmax - xmin || 1)) * w
      : left + ((i + 0.5) * w) / Math.max(1, data.length);
  return (
    <>
      <div className="chart-container">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${chart.kind} chart of ${chart.xColumn}${chart.yColumn ? ' and ' + chart.yColumn : ''}`}
        >
          <title>{chart.kind} chart</title>
          {Array.from({ length: 5 }, (_, i) => {
            const value = min + ((max - min) * i) / 4,
              y = scaleY(value);
            return (
              <g key={i}>
                <line x1={left} x2={W - right} y1={y} y2={y} stroke="#e5e9ef" />
                <text x={left - 10} y={y + 4} textAnchor="end" fontSize={11} fill="#667085">
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}
          <line x1={left} x2={W - right} y1={scaleY(0)} y2={scaleY(0)} stroke="#98a2b3" />
          {['bar', 'histogram'].includes(chart.kind) ? (
            data.map((d, i) => {
              const bw = (w / data.length) * 0.68,
                y = scaleY(d.y),
                zero = scaleY(0);
              return (
                <g key={i}>
                  <rect
                    x={scaleX(i) - bw / 2}
                    y={Math.min(y, zero)}
                    width={bw}
                    height={Math.max(1, Math.abs(zero - y))}
                    rx={3}
                    fill="#7661cf"
                  >
                    <title>
                      {d.x}: {d.y}
                    </title>
                  </rect>
                  <text
                    x={scaleX(i)}
                    y={top + h + 18}
                    fontSize={10}
                    fill="#667085"
                    textAnchor="middle"
                    transform={`rotate(-22 ${scaleX(i)} ${top + h + 18})`}
                  >
                    {String(d.x).slice(0, 20)}
                  </text>
                </g>
              );
            })
          ) : (
            <>
              {chart.kind === 'line' && (
                <polyline
                  points={data.map((d, i) => `${scaleX(i)},${scaleY(d.y)}`).join(' ')}
                  fill="none"
                  stroke="#7661cf"
                  strokeWidth={2.5}
                />
              )}{' '}
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={scaleY(d.y)}
                  r={chart.kind === 'scatter' ? 4 : 2.5}
                  fill="#7661cf"
                  opacity={0.75}
                >
                  <title>
                    {d.x}: {d.y}
                  </title>
                </circle>
              ))}
              {[0, Math.floor((data.length - 1) / 2), data.length - 1]
                .filter((n, i, a) => a.indexOf(n) === i)
                .map((i) => (
                  <text
                    key={i}
                    x={scaleX(i)}
                    y={top + h + 25}
                    fontSize={11}
                    textAnchor="middle"
                    fill="#667085"
                  >
                    {String(data[i]?.x).slice(0, 20)}
                  </text>
                ))}
            </>
          )}
          <text x={left + w / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#344054">
            {chart.xColumn}
          </text>
        </svg>
      </div>
      <details className="chart-values">
        <summary>View chart values</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{chart.xColumn}</th>
                <th>{chart.yColumn || 'Count'}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i}>
                  <td>{d.x}</td>
                  <td>{formatNumber(d.y)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
