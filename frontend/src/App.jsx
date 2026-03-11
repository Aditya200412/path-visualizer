import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './utils/api';
import { useGrid } from './hooks/useGrid';
import { ROWS, COLS, CELL, ALGOS, SPEEDS, getCellVisuals } from './utils/constants';

const APP_MODES = {
  LAB:     { id:'LAB',     label:'Algorithm Lab',     icon:'⚗' },
  TRAFFIC: { id:'TRAFFIC', label:'Traffic Navigator', icon:'🚦' },
};

export default function App() {
  const {
    grid, gridRef, vizGrid, setVizGrid,
    startPos, setStartPos, endPos, setEndPos,
    buildViz, clearAnims, resetViz, loadGrid, clearGrid, animate, paintCell
  } = useGrid();

  // ── Shared UI state ──────────────────────────────────────────────────────
  const [appMode, setAppMode]   = useState('LAB');
  const [speed, setSpeed]       = useState('Normal');
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [drawMode, setDrawMode] = useState('wall');
  const [dragging, setDragging] = useState(false);
  const [movingNode, setMovingNode] = useState(null);
  const [pulse, setPulse]       = useState(false);

  // ── Lab state ────────────────────────────────────────────────────────────
  const [algo, setAlgo]           = useState('A_STAR');
  const [labStats, setLabStats]   = useState(null);
  const [compareData, setCompare] = useState(null);

  // ── Traffic state ────────────────────────────────────────────────────────
  const [routeMode, setRouteMode]       = useState('time');
  const [showBoth, setShowBoth]         = useState(true);
  const [trafficStats, setTrafficStats] = useState({ time: null, dist: null });
  const [pathTime, setPathTime]         = useState([]);
  const [pathDist, setPathDist]         = useState([]);
  const [aiAnalysis, setAiAnalysis]     = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState(null);

  useEffect(() => { const id = setInterval(() => setPulse(p=>!p), 1800); return () => clearInterval(id); }, []);

  // ── App mode switch ──────────────────────────────────────────────────────
  const switchMode = useCallback(async (m) => {
    clearAnims(); setRunning(false); setDone(false);
    setLabStats(null); setCompare(null);
    setTrafficStats({ time: null, dist: null }); setAiAnalysis(null); setAiError(null);
    setPathTime([]); setPathDist([]);
    if (m === 'TRAFFIC') {
      setDrawMode('jam');
      try { const r = await api.trafficMap('city'); loadGrid(r.grid); } catch { clearGrid(); }
    } else {
      setDrawMode('wall');
      clearGrid();
    }
    setAppMode(m);
  }, [clearAnims, clearGrid, loadGrid]);

  // ── Lab: run single algo ─────────────────────────────────────────────────
  const handleRunLab = useCallback(async () => {
    if (running) return;
    clearAnims(); setRunning(true); setDone(false); setCompare(null); setLabStats(null);
    const [sr,sc]=startPos, [er,ec]=endPos;
    try {
      const res = await api.solvePath({
        grid: gridRef.current, startRow:sr, startCol:sc, endRow:er, endCol:ec,
        algorithm: algo, mode: 'dist'
      });
      setLabStats({ visited:res.visitedCount, pathLen:res.pathLength, cost:res.cost, time:res.computeTimeMs });
      animate(res.visited, res.path, [], [], gridRef.current, sr,sc,er,ec, speed, ()=>{ setRunning(false); setDone(true); });
    } catch (e) {
      console.error(e); setRunning(false);
    }
  }, [running, startPos, endPos, algo, speed, clearAnims, animate, gridRef]);

  // ── Lab: compare all ─────────────────────────────────────────────────────
  const handleCompare = useCallback(async () => {
    if (running) return;
    clearAnims(); setLabStats(null);
    const [sr,sc]=startPos, [er,ec]=endPos;
    try {
      const res = await api.compareAll({
        grid: gridRef.current, startRow:sr, startCol:sc, endRow:er, endCol:ec,
        algorithm: algo, mode: 'dist'
      });
      setCompare(res);
    } catch(e) { console.error(e); }
  }, [running, startPos, endPos, algo, clearAnims, gridRef]);

  // ── Traffic: run both routes ──────────────────────────────────────────────
  const handleRunTraffic = useCallback(async () => {
    if (running) return;
    clearAnims(); setRunning(true); setDone(false); setAiAnalysis(null); setAiError(null);
    const [sr,sc]=startPos, [er,ec]=endPos;
    try {
      const [rT, rD] = await Promise.all([
        api.solvePath({ grid:gridRef.current, startRow:sr, startCol:sc, endRow:er, endCol:ec, algorithm:'A_STAR', mode:'time' }),
        api.solvePath({ grid:gridRef.current, startRow:sr, startCol:sc, endRow:er, endCol:ec, algorithm:'A_STAR', mode:'dist' }),
      ]);
      setTrafficStats({
        time: { visited:rT.visitedCount, pathLen:rT.pathLength, cost:rT.cost, time:rT.computeTimeMs },
        dist: { visited:rD.visitedCount, pathLen:rD.pathLength, cost:rD.cost, time:rD.computeTimeMs },
      });
      setPathTime(rT.path); setPathDist(rD.path);
      animate(rT.visited, rT.path, showBoth?rD.visited:[], showBoth?rD.path:[], gridRef.current, sr,sc,er,ec, speed, () => { setRunning(false); setDone(true); });
    } catch(e) { console.error(e); setRunning(false); }
  }, [running, startPos, endPos, showBoth, speed, clearAnims, animate, gridRef]);

  // ── AI analyze ────────────────────────────────────────────────────────────
  const handleAI = useCallback(async () => {
    if (aiLoading || !trafficStats.time) return;
    setAiLoading(true); setAiError(null);
    try {
      const res = await api.aiAnalyze({
        grid: gridRef.current, pathTime, pathDist,
        statsTime: trafficStats.time, statsDist: trafficStats.dist,
        routeMode
      });
      setAiAnalysis(res);
    } catch(e) { setAiError('AI analysis failed. Is ANTHROPIC_API_KEY set?'); }
    setAiLoading(false);
  }, [aiLoading, trafficStats, pathTime, pathDist, routeMode, gridRef]);

  // ── Maze / Traffic map ────────────────────────────────────────────────────
  const handleMaze = async (type) => {
    clearAnims(); setDone(false); setLabStats(null); setCompare(null);
    try { const r = await api.maze(type); loadGrid(r.grid); } catch(e) { console.error(e); }
  };
  const handleTrafficMap = async (pattern) => {
    clearAnims(); setDone(false); setTrafficStats({ time:null, dist:null }); setAiAnalysis(null);
    try { const r = await api.trafficMap(pattern); loadGrid(r.grid); } catch(e) { console.error(e); }
  };

  // ── Cell interaction ──────────────────────────────────────────────────────
  const handleCell = useCallback((r, c, isDown) => {
    const [sr,sc]=startPos,[er,ec]=endPos;
    if (running) return;
    if (isDown) {
      if (r===sr&&c===sc) { setMovingNode('start'); return; }
      if (r===er&&c===ec) { setMovingNode('end');   return; }
    }
    if (movingNode) {
      if (movingNode==='start' && !(r===er&&c===ec)) setStartPos([r,c]);
      if (movingNode==='end'   && !(r===sr&&c===sc)) setEndPos([r,c]);
      return;
    }
    if (r===sr&&c===sc || r===er&&c===ec) return;
    paintCell(r, c, drawMode);
    if (done) resetViz();
  }, [running, startPos, endPos, movingNode, drawMode, done, resetViz, paintCell]);

  // ── Palette helpers ───────────────────────────────────────────────────────
  const algoColor = ALGOS[algo]?.color ?? '#00ff88';
  const cgC = { LOW:'#27ae60', MODERATE:'#f39c12', HIGH:'#e67e22', CRITICAL:'#e74c3c' };
  const vC  = aiAnalysis?.verdict==='TIME_WINS'?'#00cfff':aiAnalysis?.verdict==='DISTANCE_WINS'?'#ffcc00':'#a29bfe';

  const labTools = [
    {k:'wall',l:'⬛ Wall',c:'#8090a0'},{k:'erase',l:'✕ Erase',c:'#4a5568'},
    {k:'w2',l:'▪ Mud ×2',c:'#4caf87'},{k:'w3',l:'▪ Water ×3',c:'#4c87af'},{k:'w5',l:'▪ Rock ×5',c:'#af4caf'},
  ];
  const trafficTools = [
    {k:'jam',l:'🔴 Jam',c:'#e74c3c'},{k:'high',l:'🟠 Heavy',c:'#e67e22'},
    {k:'med',l:'🟡 Moderate',c:'#f39c12'},{k:'low',l:'🟢 Light',c:'#27ae60'},
    {k:'wall',l:'⬛ Block',c:'#607080'},{k:'erase',l:'✕ Clear',c:'#4a5568'},
  ];
  const tools = appMode==='LAB' ? labTools : trafficTools;

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{minHeight:'100vh',background:'#07090c',color:'#dde4ef',fontFamily:"'Courier New',monospace",
      display:'flex',flexDirection:'column',
      backgroundImage:'radial-gradient(ellipse at 10% 30%,#0b1a12 0%,transparent 50%),radial-gradient(ellipse at 90% 70%,#0b1220 0%,transparent 50%)'}}>

      {/* ── HEADER ── */}
      <header style={{padding:'12px 20px',borderBottom:'1px solid #141c24',background:'#090c10f0',
        backdropFilter:'blur(16px)',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',
        position:'sticky',top:0,zIndex:200}}>

        <div style={{marginRight:6}}>
          <div style={{fontSize:9,letterSpacing:5,color:'#3a5a4a',textTransform:'uppercase'}}>DSA · Java + React</div>
          <div style={{fontSize:17,fontWeight:900,letterSpacing:2,background:'linear-gradient(90deg,#00ff88,#00cfff)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PATHFINDING LAB</div>
        </div>

        {/* Mode switcher */}
        <div style={{display:'flex',background:'#0d1520',borderRadius:10,padding:3,border:'1px solid #1a2535',gap:2}}>
          {Object.values(APP_MODES).map(m=>(
            <button key={m.id} onClick={()=>switchMode(m.id)}
              style={{padding:'7px 14px',borderRadius:7,border:`1px solid ${appMode===m.id?'#00ff8855':'transparent'}`,
                background:appMode===m.id?'#00ff8812':'transparent',color:appMode===m.id?'#00ff88':'#4a5568',
                cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:appMode===m.id?700:400,transition:'all 0.18s'}}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* LAB controls */}
        {appMode==='LAB' && (<>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {Object.entries(ALGOS).map(([key,cfg])=>(
              <button key={key} onClick={()=>{if(!running){setAlgo(key);resetViz();}}}
                style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${algo===key?cfg.color+'77':'#1e2a35'}`,
                  background:algo===key?cfg.color+'15':'transparent',color:algo===key?cfg.color:'#506070',
                  cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:algo===key?700:400}}>
                {cfg.label}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:7,marginLeft:'auto'}}>
            <Btn onClick={handleRunLab} disabled={running} color={algoColor}>{running?'Running…':'▶ Run'}</Btn>
            <Btn onClick={handleCompare} disabled={running} color='#a29bfe'>⚡ Compare</Btn>
            <GhostBtn onClick={resetViz} disabled={running}>↺ Path</GhostBtn>
            <GhostBtn onClick={()=>{clearAnims();clearGrid();setDone(false);setLabStats(null);setCompare(null);setRunning(false);}}>⬜ Reset</GhostBtn>
          </div>
        </>)}

        {/* TRAFFIC controls */}
        {appMode==='TRAFFIC' && (<>
          <div style={{display:'flex',background:'#0d1520',borderRadius:9,padding:3,border:'1px solid #1a2535',gap:2}}>
            {[{k:'time',l:'⏱ Time Efficient',c:'#00cfff'},{k:'dist',l:'📏 Shortest Path',c:'#ffcc00'}].map(({k,l,c})=>(
              <button key={k} onClick={()=>setRouteMode(k)}
                style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${routeMode===k?c+'55':'transparent'}`,
                  background:routeMode===k?c+'12':'transparent',color:routeMode===k?c:'#4a5568',
                  cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:routeMode===k?700:400}}>
                {l}
              </button>
            ))}
          </div>
          <Toggle on={showBoth} onClick={()=>setShowBoth(b=>!b)} label='Compare routes'/>
          <div style={{display:'flex',gap:5}}>
            {[{k:'city',l:'🏙 City'},{k:'highway',l:'🛣 Highway'},{k:'random',l:'🎲 Random'}].map(({k,l})=>(
              <button key={k} onClick={()=>handleTrafficMap(k)}
                style={{padding:'5px 9px',borderRadius:6,border:'1px solid #1e2a35',background:'#0d1520',
                  color:'#6a8aaf',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>{l}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:7,marginLeft:'auto'}}>
            <Btn onClick={handleRunTraffic} disabled={running} color='#00cfff'>{running?'Routing…':'▶ Find Routes'}</Btn>
            <GhostBtn onClick={()=>{clearAnims();setRunning(false);setDone(false);setTrafficStats({time:null,dist:null});setAiAnalysis(null);resetViz();}}>↺ Reset</GhostBtn>
          </div>
        </>)}

        {/* Speed (shared) */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <span style={{fontSize:9,color:'#2a3a48',letterSpacing:2}}>SPD</span>
          {Object.keys(SPEEDS).map(s=>(
            <button key={s} onClick={()=>setSpeed(s)}
              style={{padding:'3px 7px',borderRadius:4,border:`1px solid ${speed===s?'#00ff8833':'#1a2535'}`,
                background:speed===s?'#00ff8810':'transparent',color:speed===s?'#00ff88':'#3a4a58',
                cursor:'pointer',fontSize:10,fontFamily:'inherit'}}>{s}</button>
          ))}
        </div>
      </header>

      {/* ── TOOLBAR ── */}
      <div style={{padding:'7px 20px',borderBottom:'1px solid #141c24',background:'#080b0e',
        display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:9,color:'#2a3a48',letterSpacing:2}}>PAINT</span>
        {tools.map(({k,l,c})=>(
          <button key={k} onClick={()=>setDrawMode(k)}
            style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${drawMode===k?c+'77':'#1a2535'}`,
              background:drawMode===k?c+'15':'transparent',color:drawMode===k?c:'#3a4a58',
              cursor:'pointer',fontSize:10,fontFamily:'inherit',transition:'all 0.14s'}}>{l}</button>
        ))}
        {appMode==='LAB' && (<>
          <span style={{fontSize:9,color:'#2a3a48',letterSpacing:2,marginLeft:6}}>MAZE</span>
          {[{k:'recursive',l:'Recursive'},{k:'prim',l:"Prim's"},{k:'random',l:'Random'}].map(({k,l})=>(
            <button key={k} onClick={()=>handleMaze(k)}
              style={{padding:'3px 8px',borderRadius:5,border:'1px solid #1a2535',background:'#0d1520',
                color:'#6a8aaf',cursor:'pointer',fontSize:10,fontFamily:'inherit'}}>{l}</button>
          ))}
        </>)}
        <span style={{marginLeft:'auto',fontSize:9,color:'#1e2a35'}}>Drag 🟢🔴 to move • click/drag to paint</span>
      </div>

      {/* ── ALGO INFO BAR (Lab only) ── */}
      {appMode==='LAB' && (
        <div style={{padding:'6px 20px',background:'#090c10',borderBottom:'1px solid #141c24',
          display:'flex',gap:18,alignItems:'center',flexWrap:'wrap',minHeight:34}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:algoColor,boxShadow:`0 0 7px ${algoColor}`}}/>
            <span style={{color:algoColor,fontWeight:700,fontSize:12}}>{ALGOS[algo]?.label}</span>
            <span style={{color:'#2a3a48'}}>—</span>
            <span style={{color:'#4a5a68',fontSize:11}}>{ALGOS[algo]?.desc}</span>
            <span style={{color:'#1e2a35'}}>|</span>
            <span style={{color:'#3a4a58',fontSize:10}}>{ALGOS[algo]?.complexity}</span>
            {ALGOS[algo]?.weighted && <Tag color={algoColor}>WEIGHT-AWARE</Tag>}
            <Tag color='#00cfff'>Java Backend</Tag>
          </div>
          {labStats && (
            <div style={{display:'flex',gap:14,marginLeft:'auto'}}>
              {[{l:'Explored',v:labStats.visited,c:'#00cfff'},{l:'Path',v:labStats.pathLen||'None',c:algoColor},
                {l:'Cost',v:typeof labStats.cost==='number'?labStats.cost.toFixed(1):'∞',c:'#ffcc00'},
                {l:'Server Time',v:`${labStats.time}ms`,c:'#ff9f43'}].map(({l,v,c})=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:8,letterSpacing:2,color:'#3a4a58'}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPARE TABLE (Lab) ── */}
      {appMode==='LAB' && compareData && (
        <div style={{padding:'10px 20px',background:'#080b0e',borderBottom:'1px solid #141c24',overflowX:'auto'}}>
          <div style={{fontSize:9,letterSpacing:3,color:'#2a3a48',marginBottom:8}}>ALL ALGORITHMS · Java Backend Results</div>
          <div style={{display:'flex',gap:9,minWidth:'max-content'}}>
            {compareData.map(r=>{
              const cfg = Object.values(ALGOS).find(a=>a.label===r.algorithm) ?? { color:'#888', label: r.algorithm };
              return (
                <div key={r.algorithm} style={{background:'#0d1520',border:`1px solid ${cfg.color}22`,borderRadius:7,padding:'8px 11px',minWidth:100}}>
                  <div style={{color:cfg.color,fontWeight:700,fontSize:12,marginBottom:5}}>{r.algorithm}</div>
                  <div style={{fontSize:10,color:'#4a5568',lineHeight:1.9}}>
                    <div>Visited: <span style={{color:'#00cfff'}}>{r.visited}</span></div>
                    <div>Path: <span style={{color:cfg.color}}>{r.pathLength||'None'}</span></div>
                    <div>Cost: <span style={{color:'#ffcc00'}}>{typeof r.cost==='number'?r.cost.toFixed(1):r.cost}</span></div>
                    <div>Time: <span style={{color:'#ff9f43'}}>{r.computeTimeMs}ms</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* GRID */}
        <div style={{flex:1,display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'14px 10px',overflow:'auto'}}>
          <div>
            <div style={{display:'grid',gridTemplateColumns:`repeat(${COLS},1fr)`,gap:1,cursor:movingNode?'grabbing':'crosshair'}}
              onMouseLeave={()=>{setDragging(false);setMovingNode(null);}}
              onMouseUp={()=>{setDragging(false);setMovingNode(null);}}>
              {vizGrid.map((row,r)=>row.map((cell,c)=>{
                const v=getCellVisuals(cell,r,c,startPos,endPos,algoColor,pulse);
                return (
                  <div key={`${r}-${c}`}
                    style={{width:15,height:15,borderRadius:2,background:v.bg,border:v.border,boxShadow:v.glow,
                      transform:`scale(${v.scale})`,display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:(v.text&&v.text.length>0)?8:0,color:'#fff',fontWeight:700,
                      transition:'background 0.07s,box-shadow 0.12s',
                      cursor:(r===startPos[0]&&c===startPos[1])||(r===endPos[0]&&c===endPos[1])?'grab':'inherit'}}
                    onMouseDown={e=>{e.preventDefault();setDragging(true);handleCell(r,c,true);}}
                    onMouseEnter={()=>{if(dragging||movingNode) handleCell(r,c,false);}}>
                    {v.text}
                  </div>
                );
              }))}
            </div>

            {/* Legend */}
            <div style={{display:'flex',gap:12,padding:'7px 2px',flexWrap:'wrap',marginTop:4}}>
              {(appMode==='LAB'
                ? [{c:'#00ff88',l:'Start'},{c:'#ff4757',l:'End'},{c:'#07090c',b:'#2a3540',l:'Wall'},
                   {c:algoColor+'44',l:'Visited'},{c:algoColor,l:'Path'},{c:'#0f2018',b:'#1e4030',l:'Mud ×2'},
                   {c:'#0f1820',b:'#1e3040',l:'Water ×3'},{c:'#180f20',b:'#301e40',l:'Rock ×5'}]
                : [{c:'#00ff88',l:'Start'},{c:'#ff4757',l:'End'},{c:'#00cfff',l:'Time Route'},{c:'#ffcc00',l:'Dist Route'},
                   {c:'#380606',b:'#881212',l:'Jam'},{c:'#280e00',b:'#5a2800',l:'Heavy'},
                   {c:'#201800',b:'#4a3800',l:'Moderate'},{c:'#0a1f0e',b:'#1a4020',l:'Light'},{c:'#07090c',b:'#1a2535',l:'Blocked'}]
              ).map(({c,b,l})=>(
                <div key={l} style={{display:'flex',gap:4,alignItems:'center'}}>
                  <div style={{width:10,height:10,borderRadius:2,background:c,border:`1px solid ${b||c+'55'}`}}/>
                  <span style={{fontSize:9,color:'#3a4a58'}}>{l}</span>
                </div>
              ))}
              <span style={{marginLeft:'auto',fontSize:9,color:'#1e2a35'}}>{ROWS}×{COLS} · Java Spring Boot</span>
            </div>
          </div>
        </div>

        {/* ── TRAFFIC SIDE PANEL ── */}
        {appMode==='TRAFFIC' && (
          <div style={{width:285,borderLeft:'1px solid #141c24',background:'#080b0e',display:'flex',flexDirection:'column',overflowY:'auto'}}>

            {/* Stats */}
            {(trafficStats.time||trafficStats.dist) && (
              <div style={{padding:'12px',borderBottom:'1px solid #141c24'}}>
                <div style={{fontSize:9,letterSpacing:3,color:'#2a3a48',marginBottom:8}}>ROUTE STATS · Server Computed</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  {[{label:'⏱ Time Route',s:trafficStats.time,color:'#00cfff'},{label:'📏 Dist Route',s:trafficStats.dist,color:'#ffcc00'}].map(({label,s,color})=>(
                    <div key={label} style={{background:'#0d1520',borderRadius:7,padding:'9px',border:`1px solid ${color}1a`}}>
                      <div style={{color,fontSize:10,fontWeight:700,marginBottom:5}}>{label}</div>
                      {s?<div style={{fontSize:10,color:'#4a5568',lineHeight:1.9}}>
                        <div>Nodes: <span style={{color}}>{s.visited}</span></div>
                        <div>Length: <span style={{color}}>{s.pathLen||'—'}</span></div>
                        <div>Cost: <span style={{color}}>{typeof s.cost==='number'?s.cost.toFixed(1):'∞'}</span></div>
                        <div>ms: <span style={{color:'#ff9f43'}}>{s.time}</span></div>
                      </div>:<div style={{color:'#2a3a48',fontSize:10}}>—</div>}
                    </div>
                  ))}
                </div>
                {trafficStats.time?.pathLen&&trafficStats.dist?.pathLen&&(
                  <div style={{marginTop:7,padding:'7px 9px',borderRadius:6,background:'#0d1520',border:'1px solid #1a2535',fontSize:10,color:'#506070'}}>
                    Time route: <span style={{color:trafficStats.time.pathLen<=trafficStats.dist.pathLen?'#00cfff':'#ffcc00',fontWeight:700}}>
                      {trafficStats.time.pathLen<=trafficStats.dist.pathLen
                        ?`${trafficStats.dist.pathLen-trafficStats.time.pathLen} steps shorter`
                        :`${trafficStats.time.pathLen-trafficStats.dist.pathLen} steps longer`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Button */}
            <div style={{padding:'12px',borderBottom:'1px solid #141c24'}}>
              <button onClick={handleAI} disabled={aiLoading||!trafficStats.time}
                style={{width:'100%',padding:'9px',borderRadius:8,
                  border:`1px solid ${aiLoading?'#a29bfe33':trafficStats.time?'#a29bfe66':'#1a2535'}`,
                  background:aiLoading?'#14102a':trafficStats.time?'#a29bfe10':'transparent',
                  color:aiLoading?'#a29bfe66':trafficStats.time?'#a29bfe':'#2a3a48',
                  cursor:aiLoading||!trafficStats.time?'not-allowed':'pointer',
                  fontSize:12,fontFamily:'inherit',fontWeight:600}}>
                {aiLoading?'🤖 Analyzing…':trafficStats.time?'🤖 AI Traffic Analysis':'Run routes first →'}
              </button>
              {aiError&&<div style={{marginTop:5,fontSize:9,color:'#e74c3c',lineHeight:1.5}}>{aiError}</div>}
            </div>

            {/* AI Results */}
            {aiAnalysis&&(
              <div style={{padding:'12px',flex:1,overflowY:'auto'}}>
                <div style={{fontSize:9,letterSpacing:3,color:'#2a3a48',marginBottom:8}}>AI ANALYSIS · Claude API</div>
                <div style={{padding:'9px 11px',borderRadius:8,background:`${vC}0c`,border:`1px solid ${vC}33`,marginBottom:8}}>
                  <div style={{fontSize:9,letterSpacing:2,color:`${vC}77`,marginBottom:3}}>VERDICT</div>
                  <div style={{fontSize:13,fontWeight:700,color:vC}}>
                    {aiAnalysis.verdict==='TIME_WINS'?'⏱ Take Time Route':aiAnalysis.verdict==='DISTANCE_WINS'?'📏 Take Shorter Route':'⚖ Equal Routes'}
                  </div>
                  <div style={{fontSize:10,color:'#7080a0',marginTop:5,lineHeight:1.5}}>{aiAnalysis.recommendation}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8}}>
                  <div style={{padding:'7px',borderRadius:6,background:'#0d1520',textAlign:'center',border:`1px solid ${cgC[aiAnalysis.congestionLevel]||'#1a2535'}22`}}>
                    <div style={{fontSize:8,color:'#2a3a48',marginBottom:2}}>CONGESTION</div>
                    <div style={{fontSize:11,fontWeight:700,color:cgC[aiAnalysis.congestionLevel]||'#4a5568'}}>{aiAnalysis.congestionLevel}</div>
                  </div>
                  <div style={{padding:'7px',borderRadius:6,background:'#0d1520',textAlign:'center',border:'1px solid #1a2535'}}>
                    <div style={{fontSize:8,color:'#2a3a48',marginBottom:2}}>TIME SAVING</div>
                    <div style={{fontSize:10,fontWeight:700,color:'#00ff88'}}>{aiAnalysis.estimatedTimeSaving}</div>
                  </div>
                </div>
                {[{key:'timeRoute',label:'⏱ Time',color:'#00cfff'},{key:'distRoute',label:'📏 Dist',color:'#ffcc00'}].map(({key,label,color})=>{
                  const rt=aiAnalysis[key]; if(!rt) return null;
                  return (
                    <div key={key} style={{marginBottom:7,padding:'8px',borderRadius:6,background:'#0d1520',border:`1px solid ${color}18`}}>
                      <div style={{color,fontSize:10,fontWeight:700,marginBottom:3}}>{label}</div>
                      <div style={{fontSize:9,color:'#6070a0',lineHeight:1.5,marginBottom:4}}>{rt.summary}</div>
                      {rt.pros?.length>0&&<div style={{fontSize:9,color:'#27ae60'}}>✓ {rt.pros.join(' • ')}</div>}
                      {rt.cons?.length>0&&<div style={{fontSize:9,color:'#c0392b',marginTop:2}}>✗ {rt.cons.join(' • ')}</div>}
                    </div>
                  );
                })}
                <div style={{padding:'7px',borderRadius:6,background:'#09111a',border:'1px solid #141c24',marginBottom:6}}>
                  <div style={{fontSize:8,color:'#2a3a48',marginBottom:2,letterSpacing:2}}>INSIGHT</div>
                  <div style={{fontSize:9,color:'#6070a0',lineHeight:1.5}}>{aiAnalysis.trafficInsight}</div>
                </div>
                <div style={{padding:'7px',borderRadius:6,background:'#091409',border:'1px solid #1a2e1a'}}>
                  <div style={{fontSize:8,color:'#27ae6077',marginBottom:2,letterSpacing:2}}>💡 TIP</div>
                  <div style={{fontSize:9,color:'#5a9a5a',lineHeight:1.5}}>{aiAnalysis.tip}</div>
                </div>
              </div>
            )}
            {!trafficStats.time&&!aiAnalysis&&(
              <div style={{padding:'24px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,opacity:0.35}}>
                <div style={{fontSize:28}}>🗺</div>
                <div style={{fontSize:10,color:'#4a5568',textAlign:'center',lineHeight:1.7}}>
                  Paint traffic zones.<br/>Run to find both routes.<br/>Ask AI to compare them.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini components ──────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, color='#00ff88' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{padding:'7px 16px',borderRadius:7,border:`1px solid ${color}55`,
        background:disabled?'transparent':`${color}15`,color:disabled?`${color}44`:color,
        cursor:disabled?'not-allowed':'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',
        boxShadow:disabled?'none':`0 0 16px ${color}18`,transition:'all 0.15s'}}>
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{padding:'7px 10px',borderRadius:7,border:'1px solid #1e2a35',background:'transparent',
        color:disabled?'#2a3a48':'#506070',cursor:disabled?'not-allowed':'pointer',fontSize:11,fontFamily:'inherit'}}>
      {children}
    </button>
  );
}
function Toggle({ on, onClick, label }) {
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',userSelect:'none'}}>
      <div style={{width:34,height:18,borderRadius:9,background:on?'#00cfff22':'#1a2535',
        border:`1px solid ${on?'#00cfff44':'#2a3545'}`,position:'relative',transition:'all 0.2s'}}>
        <div style={{position:'absolute',top:2,left:on?16:2,width:12,height:12,borderRadius:'50%',
          background:on?'#00cfff':'#4a5568',transition:'left 0.2s'}}/>
      </div>
      <span style={{fontSize:11,color:'#4a5568'}}>{label}</span>
    </div>
  );
}
function Tag({ children, color }) {
  return <span style={{fontSize:9,color:`${color}88`,border:`1px solid ${color}33`,padding:'1px 5px',borderRadius:3}}>{children}</span>;
}
