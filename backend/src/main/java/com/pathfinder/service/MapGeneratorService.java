package com.pathfinder.service;

import com.pathfinder.model.CellType;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Server-side maze + traffic map generators.
 */
@Service
public class MapGeneratorService {

    private static final int ROWS = 20;
    private static final int COLS = 48;
    private final Random rng = new Random();

    // ── Maze generators ───────────────────────────────────────────────────────

    public int[][] generateMaze(String type) {
        return switch (type.toLowerCase()) {
            case "prim"      -> primMaze();
            case "random"    -> randomMaze();
            default          -> recursiveMaze();
        };
    }

    /** Recursive backtracking (DFS carving). */
    private int[][] recursiveMaze() {
        int[][] grid = fill(CellType.WALL.getValue());
        grid[1][1] = CellType.EMPTY.getValue();
        carve(grid, 1, 1);
        return grid;
    }

    private void carve(int[][] grid, int r, int c) {
        int[][] dirs = {{0,2},{2,0},{0,-2},{-2,0}};
        shuffle(dirs);
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr > 0 && nr < ROWS-1 && nc > 0 && nc < COLS-1 && grid[nr][nc] == CellType.WALL.getValue()) {
                grid[r + d[0]/2][c + d[1]/2] = CellType.EMPTY.getValue();
                grid[nr][nc] = CellType.EMPTY.getValue();
                carve(grid, nr, nc);
            }
        }
    }

    /** Randomised Prim's algorithm. */
    private int[][] primMaze() {
        int[][] grid = fill(CellType.WALL.getValue());
        Set<String> inMaze = new HashSet<>();
        List<int[]> frontier = new ArrayList<>();

        grid[1][1] = CellType.EMPTY.getValue();
        inMaze.add("1,1");
        addFrontier(frontier, inMaze, 1, 3);
        addFrontier(frontier, inMaze, 3, 1);

        while (!frontier.isEmpty()) {
            int idx = rng.nextInt(frontier.size());
            int[] cell = frontier.remove(idx);
            int r = cell[0], c = cell[1];

            List<int[]> neighbors = new ArrayList<>();
            for (int[] d : new int[][]{{-2,0},{2,0},{0,-2},{0,2}}) {
                int nr = r+d[0], nc = c+d[1];
                if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS && inMaze.contains(nr+","+nc))
                    neighbors.add(new int[]{nr, nc});
            }
            if (!neighbors.isEmpty()) {
                int[] nb = neighbors.get(rng.nextInt(neighbors.size()));
                grid[(r+nb[0])/2][(c+nb[1])/2] = CellType.EMPTY.getValue();
                grid[r][c] = CellType.EMPTY.getValue();
                inMaze.add(r+","+c);
                addFrontier(frontier, inMaze, r-2, c);
                addFrontier(frontier, inMaze, r+2, c);
                addFrontier(frontier, inMaze, r, c-2);
                addFrontier(frontier, inMaze, r, c+2);
            }
        }
        return grid;
    }

    private void addFrontier(List<int[]> frontier, Set<String> inMaze, int r, int c) {
        if (r>0 && r<ROWS && c>0 && c<COLS
            && !inMaze.contains(r+","+c)
            && frontier.stream().noneMatch(f -> f[0]==r && f[1]==c)) {
            frontier.add(new int[]{r, c});
        }
    }

    /** Simple random scatter maze. */
    private int[][] randomMaze() {
        int[][] grid = fill(CellType.EMPTY.getValue());
        for (int r = 0; r < ROWS; r++)
            for (int c = 0; c < COLS; c++)
                if (rng.nextDouble() < 0.28) grid[r][c] = CellType.WALL.getValue();
        return grid;
    }

    // ── Traffic map generators ─────────────────────────────────────────────────

    public int[][] generateTrafficMap(String pattern) {
        return switch (pattern.toLowerCase()) {
            case "highway" -> highwayMap();
            case "random"  -> randomTrafficMap();
            default        -> cityMap();
        };
    }

    /** City with main arteries, intersections, and jam clusters. */
    private int[][] cityMap() {
        int[][] grid = fill(CellType.EMPTY.getValue());
        int[] artRows = {7, 14};
        int[] artCols = {11, 24, 36};

        for (int ar : artRows)
            for (int c = 0; c < COLS; c++)
                grid[ar][c] = rng.nextDouble() < 0.65 ? CellType.TRAFFIC_HIGH.getValue() : CellType.TRAFFIC_MED.getValue();

        for (int ac : artCols)
            for (int r = 0; r < ROWS; r++)
                if (grid[r][ac] == CellType.EMPTY.getValue())
                    grid[r][ac] = rng.nextDouble() < 0.6 ? CellType.TRAFFIC_HIGH.getValue() : CellType.TRAFFIC_MED.getValue();

        // Intersection jams
        for (int ar : artRows)
            for (int ac : artCols)
                for (int dr = -1; dr <= 1; dr++)
                    for (int dc = -1; dc <= 1; dc++) {
                        int nr = ar+dr, nc = ac+dc;
                        if (nr>=0 && nr<ROWS && nc>=0 && nc<COLS)
                            grid[nr][nc] = CellType.TRAFFIC_JAM.getValue();
                    }

        // Scatter light traffic
        for (int i = 0; i < 60; i++) {
            int r = rng.nextInt(ROWS), c = rng.nextInt(COLS);
            if (grid[r][c] == CellType.EMPTY.getValue()) grid[r][c] = CellType.TRAFFIC_LOW.getValue();
        }
        // Buildings
        for (int i = 0; i < 110; i++) {
            int r = rng.nextInt(ROWS), c = rng.nextInt(COLS);
            if (grid[r][c] == CellType.EMPTY.getValue()) grid[r][c] = CellType.WALL.getValue();
        }
        return grid;
    }

    /** Highway – single congested artery. */
    private int[][] highwayMap() {
        int[][] grid = fill(CellType.EMPTY.getValue());
        int mid = ROWS / 2;
        for (int c = 0; c < COLS; c++) {
            grid[mid][c]   = rng.nextDouble() < 0.45 ? CellType.TRAFFIC_JAM.getValue() : CellType.TRAFFIC_HIGH.getValue();
            grid[mid-2][c] = rng.nextDouble() < 0.3  ? CellType.TRAFFIC_MED.getValue() : CellType.TRAFFIC_LOW.getValue();
        }
        for (int i = 0; i < 75; i++) {
            int r = rng.nextInt(ROWS), c = rng.nextInt(COLS);
            if (grid[r][c] == CellType.EMPTY.getValue() && r != mid && r != mid-2)
                grid[r][c] = CellType.WALL.getValue();
        }
        return grid;
    }

    /** Fully random traffic scatter. */
    private int[][] randomTrafficMap() {
        int[][] grid = fill(CellType.EMPTY.getValue());
        for (int r = 0; r < ROWS; r++)
            for (int c = 0; c < COLS; c++) {
                double x = rng.nextDouble();
                if      (x < 0.12) grid[r][c] = CellType.WALL.getValue();
                else if (x < 0.22) grid[r][c] = CellType.TRAFFIC_JAM.getValue();
                else if (x < 0.34) grid[r][c] = CellType.TRAFFIC_HIGH.getValue();
                else if (x < 0.46) grid[r][c] = CellType.TRAFFIC_MED.getValue();
                else if (x < 0.58) grid[r][c] = CellType.TRAFFIC_LOW.getValue();
            }
        return grid;
    }

    // ── Utilities ──────────────────────────────────────────────────────────────
    private int[][] fill(int val) {
        int[][] grid = new int[ROWS][COLS];
        for (int[] row : grid) Arrays.fill(row, val);
        return grid;
    }

    private void shuffle(int[][] arr) {
        for (int i = arr.length-1; i > 0; i--) {
            int j = rng.nextInt(i+1);
            int[] tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
}
