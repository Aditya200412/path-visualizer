import { useState, useRef, useCallback } from 'react';
import { ROWS, COLS, CELL, SPEEDS } from '../utils/constants';

const makeEmpty = () => Array.from({ length: ROWS }, () => Array(COLS).fill(CELL.EMPTY));

export function useGrid() {
  const [grid, setGrid]         = useState(makeEmpty);
  const [vizGrid, setVizGrid]   = useState(makeEmpty);
  const [startPos, setStartPos] = useState([2, 2]);
  const [endPos, setEndPos]     = useState([ROWS - 3, COLS - 4]);
  const animRef = useRef([]);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // ── Build the display layer ──────────────────────────────────────────────
  const buildViz = useCallback((g, sr, sc, er, ec, va=[], pa=[], vb=[], pb=[]) => {
    const d = g.map((row, r) => row.map((cell, c) => {
      if (r===sr && c===sc) return CELL.START;
      if (r===er && c===ec) return CELL.END;
      return cell;
    }));
    vb.forEach(([r,c]) => { if (d[r][c]!==CELL.START&&d[r][c]!==CELL.END) d[r][c]=CELL.VISITED_B; });
    va.forEach(([r,c]) => { if (d[r][c]!==CELL.START&&d[r][c]!==CELL.END) d[r][c]=CELL.VISITED; });
    pb.forEach(([r,c]) => { if (d[r][c]!==CELL.START&&d[r][c]!==CELL.END) d[r][c]=CELL.PATH_B; });
    pa.forEach(([r,c]) => { if (d[r][c]!==CELL.START&&d[r][c]!==CELL.END) d[r][c]=CELL.PATH; });
    return d;
  }, []);

  const clearAnims = () => { animRef.current.forEach(clearTimeout); animRef.current = []; };

  const resetViz = useCallback(() => {
    clearAnims();
    setVizGrid(buildViz(gridRef.current, ...startPos, ...endPos));
  }, [startPos, endPos, buildViz]);

  const loadGrid = useCallback((newGrid) => {
    clearAnims();
    setGrid(newGrid);
    setVizGrid(buildViz(newGrid, ...startPos, ...endPos));
  }, [startPos, endPos, buildViz]);

  const clearGrid = useCallback(() => {
    clearAnims();
    const g = makeEmpty();
    setGrid(g);
    setVizGrid(buildViz(g, ...startPos, ...endPos));
  }, [startPos, endPos, buildViz]);

  // ── Animated playback ────────────────────────────────────────────────────
  const animate = useCallback((va, pa, vb, pb, g, sr, sc, er, ec, speedKey, onDone) => {
    clearAnims();
    const spd = SPEEDS[speedKey] ?? 16;
    if (spd === 0) {
      setVizGrid(buildViz(g,sr,sc,er,ec,va,pa,vb,pb));
      onDone?.(); return;
    }
    const maxV = Math.max(va.length, vb.length);
    for (let i = 0; i < maxV; i++) {
      animRef.current.push(setTimeout(() => {
        setVizGrid(buildViz(g,sr,sc,er,ec,va.slice(0,i+1),[],vb.slice(0,i+1),[]));
      }, i * spd));
    }
    const pStart = maxV * spd;
    const maxP = Math.max(pa.length, pb.length);
    for (let i = 0; i < maxP; i++) {
      animRef.current.push(setTimeout(() => {
        setVizGrid(buildViz(g,sr,sc,er,ec,va,pa.slice(0,i+1),vb,pb.slice(0,i+1)));
      }, pStart + i * spd * 1.4));
    }
    animRef.current.push(setTimeout(() => {
      setVizGrid(buildViz(g,sr,sc,er,ec,va,pa,vb,pb));
      onDone?.();
    }, pStart + maxP * spd * 1.4 + 200));
  }, [buildViz]);

  // ── Paint cell ───────────────────────────────────────────────────────────
  const paintCell = useCallback((r, c, drawMode) => {
    const [sr,sc]=startPos,[er,ec]=endPos;
    if (r===sr&&c===sc || r===er&&c===ec) return;
    setGrid(g => {
      const ng = g.map(row => [...row]);
      const map = { wall:CELL.WALL, erase:CELL.EMPTY, w2:CELL.WEIGHT_2, w3:CELL.WEIGHT_3, w5:CELL.WEIGHT_5,
                    low:CELL.TRAFFIC_LOW, med:CELL.TRAFFIC_MED, high:CELL.TRAFFIC_HIGH, jam:CELL.TRAFFIC_JAM };
      ng[r][c] = drawMode === 'wall'
        ? (ng[r][c] === CELL.WALL ? CELL.EMPTY : CELL.WALL)
        : (map[drawMode] ?? CELL.EMPTY);
      return ng;
    });
  }, [startPos, endPos]);

  return {
    grid, gridRef, vizGrid, setVizGrid,
    startPos, setStartPos,
    endPos, setEndPos,
    buildViz, clearAnims, resetViz, loadGrid, clearGrid, animate, paintCell
  };
}
