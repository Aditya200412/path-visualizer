package com.pathfinder.service;

import com.pathfinder.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * All pathfinding algorithms implemented server-side in Java.
 *
 * Algorithms:
 *   A*          – weighted, optimal with Manhattan heuristic
 *   Dijkstra    – weighted, optimal
 *   BFS         – unweighted, optimal
 *   DFS         – unweighted, not optimal
 *   Greedy      – heuristic-only, fast but not optimal
 *   Bidirectional BFS – meets in the middle
 */
@Service
public class PathfindingService {

    private static final int ROWS = 20;
    private static final int COLS = 48;
    private static final int[][] DIRS = {{0,1},{1,0},{0,-1},{-1,0}};

    // ── Public dispatch ──────────────────────────────────────────────────────
    public PathResponse solve(PathRequest req) {
        long start = System.currentTimeMillis();

        int[][] grid = req.grid();
        Node s = new Node(req.startRow(), req.startCol());
        Node e = new Node(req.endRow(),   req.endCol());
        String mode = req.mode();

        AlgoResult result = switch (req.algorithm().toUpperCase()) {
            case "A_STAR"    -> aStar(grid, s, e, mode);
            case "DIJKSTRA"  -> dijkstra(grid, s, e, mode);
            case "BFS"       -> bfs(grid, s, e);
            case "DFS"       -> dfs(grid, s, e);
            case "GREEDY"    -> greedy(grid, s, e);
            case "BI_BFS"    -> biBfs(grid, s, e);
            default          -> aStar(grid, s, e, mode);
        };

        long elapsed = System.currentTimeMillis() - start;

        return new PathResponse(
            result.visited(),
            result.path(),
            result.cost(),
            result.visited().size(),
            result.path().size(),
            elapsed,
            req.algorithm(),
            mode
        );
    }

    /** Run all algorithms and return comparison table. */
    public List<CompareEntry> compareAll(PathRequest req) {
        List<CompareEntry> results = new ArrayList<>();
        int[][] grid = req.grid();
        Node s = new Node(req.startRow(), req.startCol());
        Node e = new Node(req.endRow(),   req.endCol());

        for (String algo : List.of("A_STAR","DIJKSTRA","BFS","DFS","GREEDY","BI_BFS")) {
            long t0 = System.currentTimeMillis();
            AlgoResult r = switch (algo) {
                case "A_STAR"   -> aStar(grid, s, e, "dist");
                case "DIJKSTRA" -> dijkstra(grid, s, e, "dist");
                case "BFS"      -> bfs(grid, s, e);
                case "DFS"      -> dfs(grid, s, e);
                case "GREEDY"   -> greedy(grid, s, e);
                default         -> biBfs(grid, s, e);
            };
            long elapsed = System.currentTimeMillis() - t0;
            results.add(new CompareEntry(algo, r.visited().size(), r.path().size(),
                r.cost(), elapsed, !r.path().isEmpty()));
        }
        return results;
    }

    // ── A* ───────────────────────────────────────────────────────────────────
    private AlgoResult aStar(int[][] grid, Node start, Node end, String mode) {
        int rows = grid.length, cols = grid[0].length;
        double[][] g = initInf(rows, cols);
        Map<Node, Node> prev = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        g[start.row()][start.col()] = 0;

        // Priority queue: [f, row, col]
        PriorityQueue<double[]> open = new PriorityQueue<>(Comparator.comparingDouble(a -> a[0]));
        Set<String> inOpen = new HashSet<>();
        open.offer(new double[]{start.heuristic(end), start.row(), start.col()});
        inOpen.add(start.toString());

        while (!open.isEmpty()) {
            double[] cur = open.poll();
            int r = (int) cur[1], c = (int) cur[2];
            Node n = new Node(r, c);
            inOpen.remove(n.toString());
            visited.add(new int[]{r, c});
            if (n.equals(end)) break;

            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (!inBounds(nr, nc, rows, cols)) continue;
                CellType ct = CellType.fromValue(grid[nr][nc]);
                if (ct == CellType.WALL) continue;
                double w = mode.equals("time") ? ct.timeCost() : ct.distCost();
                double ng = g[r][c] + w;
                Node nb = new Node(nr, nc);
                if (ng < g[nr][nc]) {
                    g[nr][nc] = ng;
                    prev.put(nb, n);
                    if (!inOpen.contains(nb.toString())) {
                        open.offer(new double[]{ng + nb.heuristic(end), nr, nc});
                        inOpen.add(nb.toString());
                    }
                }
            }
        }
        double cost = g[end.row()][end.col()];
        return new AlgoResult(visited, rebuildPath(prev, end), Double.isInfinite(cost) ? -1 : cost);
    }

    // ── Dijkstra ──────────────────────────────────────────────────────────────
    private AlgoResult dijkstra(int[][] grid, Node start, Node end, String mode) {
        int rows = grid.length, cols = grid[0].length;
        double[][] dist = initInf(rows, cols);
        Map<Node, Node> prev = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        dist[start.row()][start.col()] = 0;

        PriorityQueue<double[]> pq = new PriorityQueue<>(Comparator.comparingDouble(a -> a[0]));
        pq.offer(new double[]{0, start.row(), start.col()});

        while (!pq.isEmpty()) {
            double[] cur = pq.poll();
            double d = cur[0]; int r = (int) cur[1], c = (int) cur[2];
            if (d > dist[r][c]) continue;
            Node n = new Node(r, c);
            visited.add(new int[]{r, c});
            if (n.equals(end)) break;

            for (int[] dir : DIRS) {
                int nr = r + dir[0], nc = c + dir[1];
                if (!inBounds(nr, nc, rows, cols)) continue;
                CellType ct = CellType.fromValue(grid[nr][nc]);
                if (ct == CellType.WALL) continue;
                double w = mode.equals("time") ? ct.timeCost() : ct.distCost();
                double nd = d + w;
                if (nd < dist[nr][nc]) {
                    dist[nr][nc] = nd;
                    Node nb = new Node(nr, nc);
                    prev.put(nb, n);
                    pq.offer(new double[]{nd, nr, nc});
                }
            }
        }
        double cost = dist[end.row()][end.col()];
        return new AlgoResult(visited, rebuildPath(prev, end), Double.isInfinite(cost) ? -1 : cost);
    }

    // ── BFS ───────────────────────────────────────────────────────────────────
    private AlgoResult bfs(int[][] grid, Node start, Node end) {
        int rows = grid.length, cols = grid[0].length;
        Map<Node, Node> prev = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        Queue<Node> queue = new LinkedList<>();
        queue.offer(start);
        seen.add(start.toString());

        while (!queue.isEmpty()) {
            Node cur = queue.poll();
            visited.add(new int[]{cur.row(), cur.col()});
            if (cur.equals(end)) break;
            for (int[] d : DIRS) {
                int nr = cur.row() + d[0], nc = cur.col() + d[1];
                if (!inBounds(nr, nc, rows, cols)) continue;
                if (CellType.fromValue(grid[nr][nc]) == CellType.WALL) continue;
                Node nb = new Node(nr, nc);
                if (!seen.contains(nb.toString())) {
                    seen.add(nb.toString()); prev.put(nb, cur); queue.offer(nb);
                }
            }
        }
        return new AlgoResult(visited, rebuildPath(prev, end), visited.size());
    }

    // ── DFS ───────────────────────────────────────────────────────────────────
    private AlgoResult dfs(int[][] grid, Node start, Node end) {
        int rows = grid.length, cols = grid[0].length;
        Map<Node, Node> prev = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        Deque<Node> stack = new ArrayDeque<>();
        stack.push(start);
        seen.add(start.toString());

        while (!stack.isEmpty()) {
            Node cur = stack.pop();
            visited.add(new int[]{cur.row(), cur.col()});
            if (cur.equals(end)) break;
            for (int[] d : DIRS) {
                int nr = cur.row() + d[0], nc = cur.col() + d[1];
                if (!inBounds(nr, nc, rows, cols)) continue;
                if (CellType.fromValue(grid[nr][nc]) == CellType.WALL) continue;
                Node nb = new Node(nr, nc);
                if (!seen.contains(nb.toString())) {
                    seen.add(nb.toString()); prev.put(nb, cur); stack.push(nb);
                }
            }
        }
        return new AlgoResult(visited, rebuildPath(prev, end), visited.size());
    }

    // ── Greedy Best-First ─────────────────────────────────────────────────────
    private AlgoResult greedy(int[][] grid, Node start, Node end) {
        int rows = grid.length, cols = grid[0].length;
        Map<Node, Node> prev = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        PriorityQueue<double[]> open = new PriorityQueue<>(Comparator.comparingDouble(a -> a[0]));
        open.offer(new double[]{start.heuristic(end), start.row(), start.col()});
        seen.add(start.toString());

        while (!open.isEmpty()) {
            double[] cur = open.poll();
            int r = (int) cur[1], c = (int) cur[2];
            Node n = new Node(r, c);
            visited.add(new int[]{r, c});
            if (n.equals(end)) break;
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (!inBounds(nr, nc, rows, cols)) continue;
                if (CellType.fromValue(grid[nr][nc]) == CellType.WALL) continue;
                Node nb = new Node(nr, nc);
                if (!seen.contains(nb.toString())) {
                    seen.add(nb.toString()); prev.put(nb, n);
                    open.offer(new double[]{nb.heuristic(end), nr, nc});
                }
            }
        }
        return new AlgoResult(visited, rebuildPath(prev, end), visited.size());
    }

    // ── Bidirectional BFS ─────────────────────────────────────────────────────
    private AlgoResult biBfs(int[][] grid, Node start, Node end) {
        int rows = grid.length, cols = grid[0].length;
        Map<String, String> fwd = new HashMap<>(), bwd = new HashMap<>();
        List<int[]> visited = new ArrayList<>();
        Queue<Node> fQ = new LinkedList<>(), bQ = new LinkedList<>();
        fwd.put(start.toString(), null);
        bwd.put(end.toString(), null);
        fQ.offer(start); bQ.offer(end);
        String meetKey = null;

        outer:
        while (!fQ.isEmpty() && !bQ.isEmpty()) {
            // Expand forward
            int fSize = fQ.size();
            for (int i = 0; i < fSize; i++) {
                Node cur = fQ.poll();
                visited.add(new int[]{cur.row(), cur.col()});
                for (int[] d : DIRS) {
                    int nr = cur.row()+d[0], nc = cur.col()+d[1];
                    if (!inBounds(nr, nc, rows, cols)) continue;
                    if (CellType.fromValue(grid[nr][nc]) == CellType.WALL) continue;
                    Node nb = new Node(nr, nc);
                    if (!fwd.containsKey(nb.toString())) {
                        fwd.put(nb.toString(), cur.toString()); fQ.offer(nb);
                    }
                    if (bwd.containsKey(nb.toString())) { meetKey = nb.toString(); break outer; }
                }
            }
            // Expand backward
            int bSize = bQ.size();
            for (int i = 0; i < bSize; i++) {
                Node cur = bQ.poll();
                visited.add(new int[]{cur.row(), cur.col()});
                for (int[] d : DIRS) {
                    int nr = cur.row()+d[0], nc = cur.col()+d[1];
                    if (!inBounds(nr, nc, rows, cols)) continue;
                    if (CellType.fromValue(grid[nr][nc]) == CellType.WALL) continue;
                    Node nb = new Node(nr, nc);
                    if (!bwd.containsKey(nb.toString())) {
                        bwd.put(nb.toString(), cur.toString()); bQ.offer(nb);
                    }
                    if (fwd.containsKey(nb.toString())) { meetKey = nb.toString(); break outer; }
                }
            }
        }

        List<int[]> path = new ArrayList<>();
        if (meetKey != null) {
            // Forward half
            List<int[]> fHalf = new ArrayList<>();
            String cur = meetKey;
            while (cur != null) { int[] rc = toArr(cur); fHalf.add(rc); cur = fwd.get(cur); }
            Collections.reverse(fHalf);
            path.addAll(fHalf);
            // Backward half
            cur = bwd.get(meetKey);
            while (cur != null) { path.add(toArr(cur)); cur = bwd.get(cur); }
        }
        return new AlgoResult(visited, path, visited.size());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private List<int[]> rebuildPath(Map<Node, Node> prev, Node end) {
        List<int[]> path = new ArrayList<>();
        Node cur = end;
        while (prev.containsKey(cur)) {
            path.add(new int[]{cur.row(), cur.col()});
            cur = prev.get(cur);
        }
        Collections.reverse(path);
        return path;
    }

    private double[][] initInf(int rows, int cols) {
        double[][] d = new double[rows][cols];
        for (double[] row : d) Arrays.fill(row, Double.MAX_VALUE);
        return d;
    }

    private boolean inBounds(int r, int c, int rows, int cols) {
        return r >= 0 && r < rows && c >= 0 && c < cols;
    }

    private int[] toArr(String key) {
        String[] p = key.split(",");
        return new int[]{Integer.parseInt(p[0]), Integer.parseInt(p[1])};
    }

    // ── Internal result type ──────────────────────────────────────────────────
    private record AlgoResult(List<int[]> visited, List<int[]> path, double cost) {}
}
