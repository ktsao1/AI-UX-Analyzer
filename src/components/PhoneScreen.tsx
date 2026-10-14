import { useState } from 'react';
import type { GridCell } from '../lib/types';

const CELL: Record<GridCell, [number, number]> = {
  'top-left': [0, 0], 'top-center': [1, 0], 'top-right': [2, 0],
  'center-left': [0, 1], center: [1, 1], 'center-right': [2, 1],
  'bottom-left': [0, 2], 'bottom-center': [1, 2], 'bottom-right': [2, 2],
};

/** A prototype screen in a plain phone body. When the persona has named
 *  where it would tap, the 3×3 grid is drawn over the screen with that cell
 *  lit; when the element was found in the prototype, a dot marks it.
 *
 *  The body takes each picture's own proportions once it has loaded, and
 *  keeps the last one's until then, so it never collapses between screens. */
export function PhoneScreen({ src, alt, cell, tap }: { src?: string; alt: string; cell?: GridCell | null; tap?: { x: number; y: number } }) {
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <div className="phone">
      <div className="phone-screen" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        {src && (
          <img
            key={src}
            className="fade-in"
            src={src}
            alt={alt}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
            }}
          />
        )}
        {cell && (
          <div className="grid fade-in" aria-hidden="true">
            <span className="cell" style={{ left: `${CELL[cell][0] * 33.333}%`, top: `${CELL[cell][1] * 33.333}%` }} />
            <i className="v" style={{ left: '33.333%' }} /><i className="v" style={{ left: '66.666%' }} />
            <i className="h" style={{ top: '33.333%' }} /><i className="h" style={{ top: '66.666%' }} />
          </div>
        )}
        {tap && <span className="tap" aria-hidden="true" style={{ left: `${tap.x}%`, top: `${tap.y}%` }} />}
      </div>
    </div>
  );
}
