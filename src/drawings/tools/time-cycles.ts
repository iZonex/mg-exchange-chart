// ── Time Cycles ─────────────────────────────────────────────────────────────
// Like cyclic-lines but with adjustable phase and cycle count labels.
// 2 points define one full cycle. Draws vertical lines + cycle count labels.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label';

export const timeCyclesTool: InternalDrawingTool = {
  name: 'time-cycles',
  icon: 'M3,2 L3,22 M12,2 L12,22 M21,2 L21,22',
  pointCount: 2,

  render(ctx, points, options, width, height) {
    if (points.length < 2) return;
    const interval = Math.abs(points[1]!.x - points[0]!.x);
    if (interval < 2) return;
    const start = Math.min(points[0]!.x, points[1]!.x);

    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;

    // Render cycle lines forward from start
    let cycleNum = 0;
    for (let x = start; x <= width + interval; x += interval) {
      ctx.globalAlpha = cycleNum === 0 ? 0.6 : 0.3;
      ctx.setLineDash(cycleNum === 0 ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();

      // Cycle count label at top
      ctx.font = font(9);
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${t('cycle')} ${cycleNum}`, x, 4);

      cycleNum++;
    }

    // Render lines backward from start
    cycleNum = -1;
    for (let x = start - interval; x >= -interval; x -= interval) {
      ctx.globalAlpha = 0.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();

      ctx.font = font(9);
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.5;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${t('cycle')} ${cycleNum}`, x, 4);

      cycleNum--;
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Interval label (between p1 and p2)
    const data = (options as any)._lineData as { bars: number } | undefined;
    const barLabel = data ? `${data.bars} ${t('bars')}` : `${interval.toFixed(0)}px`;
    drawDataLabel(ctx, (points[0]!.x + points[1]!.x) / 2, height - 20, barLabel, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const interval = Math.abs(points[1]!.x - points[0]!.x);
    if (interval < 2) return false;
    const start = Math.min(points[0]!.x, points[1]!.x);
    const offset = ((mouse.x - start) % interval + interval) % interval;
    return offset <= threshold || offset >= interval - threshold;
  },

  getHandles(points) { return points.slice(0, 2); },
};
