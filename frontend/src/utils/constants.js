export const ROWS = 20;
export const COLS = 48;

export const CELL = {
  EMPTY: 0, WALL: 1, START: 2, END: 3,
  VISITED: 4, PATH: 5,
  VISITED_B: 6, PATH_B: 7,
  TRAFFIC_LOW: 8, TRAFFIC_MED: 9, TRAFFIC_HIGH: 10, TRAFFIC_JAM: 11,
  WEIGHT_2: 12, WEIGHT_3: 13, WEIGHT_5: 14,
};

export const SPEEDS = { Slow: 55, Normal: 16, Fast: 4, Instant: 0 };

export const ALGOS = {
  A_STAR:    { label:'A*',       color:'#00ff88', desc:'Optimal + Heuristic',  complexity:'O(E log V)', weighted:true  },
  DIJKSTRA:  { label:'Dijkstra', color:'#00cfff', desc:'Optimal, weighted',    complexity:'O(E log V)', weighted:true  },
  BFS:       { label:'BFS',      color:'#ffcc00', desc:'Optimal, unweighted',  complexity:'O(V + E)',   weighted:false },
  DFS:       { label:'DFS',      color:'#ff6b6b', desc:'Not optimal',          complexity:'O(V + E)',   weighted:false },
  GREEDY:    { label:'Greedy',   color:'#ff9f43', desc:'Fast heuristic',       complexity:'O(E log V)', weighted:false },
  BI_BFS:    { label:'Bi-BFS',   color:'#a29bfe', desc:'Bidirectional BFS',    complexity:'O(b^(d/2))',weighted:false },
};

export function getCellVisuals(cell, r, c, startPos, endPos, algoColor, pulse) {
  const [sr,sc] = startPos, [er,ec] = endPos;
  if (r===sr && c===sc) return { bg:'#00ff88', border:'2px solid #00ff8899', glow:'0 0 14px #00ff8866', text:'▶', scale:1.2 };
  if (r===er && c===ec) return { bg:'#ff4757', border:'2px solid #ff475799', glow:'0 0 14px #ff475766', text:'◉', scale:1.2 };
  switch(cell){
    case CELL.WALL:         return { bg:'#07090c', border:'1px solid #0e1318', glow:'none', text:'',  scale:1 };
    case CELL.VISITED:      return { bg:algoColor+'28', border:`1px solid ${algoColor}18`, glow:'none', text:'', scale:1 };
    case CELL.PATH:         return { bg:algoColor,      border:`1px solid ${algoColor}`,   glow:`0 0 8px ${algoColor}88`, text:'', scale:1.05 };
    case CELL.VISITED_B:    return { bg:'#ffcc0018', border:'1px solid #ffcc0012', glow:'none', text:'', scale:1 };
    case CELL.PATH_B:       return { bg:'#ffcc00',   border:'1px solid #ffcc00',   glow:'0 0 8px #ffcc0066', text:'', scale:1.05 };
    case CELL.TRAFFIC_LOW:  return { bg:'#0a1f0e', border:'1px solid #1a4020', glow:'none', text:'', scale:1 };
    case CELL.TRAFFIC_MED:  return { bg:'#201800', border:'1px solid #4a3800', glow:'none', text:'', scale:1 };
    case CELL.TRAFFIC_HIGH: return { bg:'#280e00', border:'1px solid #5a2800', glow:'none', text:'', scale:1 };
    case CELL.TRAFFIC_JAM:  return { bg:pulse?'#4a0808':'#380606', border:'1px solid #881212', glow:pulse?'0 0 6px #ff000033':'none', text:'', scale:1 };
    case CELL.WEIGHT_2:     return { bg:'#0f2018', border:'1px solid #1e4030', glow:'none', text:'2', scale:1 };
    case CELL.WEIGHT_3:     return { bg:'#0f1820', border:'1px solid #1e3040', glow:'none', text:'3', scale:1 };
    case CELL.WEIGHT_5:     return { bg:'#180f20', border:'1px solid #301e40', glow:'none', text:'5', scale:1 };
    default:                return { bg:'#0e1318', border:'1px solid #161d24', glow:'none', text:'', scale:1 };
  }
}
