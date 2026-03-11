package com.pathfinder.model;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

// ── Pathfinding request ────────────────────────────────────────────────────────
public record PathRequest(
    @NotNull int[][] grid,
    @NotNull int startRow,
    @NotNull int startCol,
    @NotNull int endRow,
    @NotNull int endCol,
    @NotNull String algorithm,   // A_STAR | DIJKSTRA | BFS | DFS | GREEDY | BI_BFS
    @NotNull String mode         // time | dist
) {}

// ── Pathfinding response ───────────────────────────────────────────────────────
public record PathResponse(
    List<int[]> visited,
    List<int[]> path,
    double cost,
    int visitedCount,
    int pathLength,
    long computeTimeMs,
    String algorithm,
    String mode
) {}

// ── Compare-all response entry ─────────────────────────────────────────────────
public record CompareEntry(
    String algorithm,
    int visited,
    int pathLength,
    double cost,
    long computeTimeMs,
    boolean pathFound
) {}

// ── AI analysis request ────────────────────────────────────────────────────────
public record AiAnalysisRequest(
    @NotNull int[][] grid,
    List<int[]> pathTime,
    List<int[]> pathDist,
    PathStats statsTime,
    PathStats statsDist,
    String routeMode
) {}

// ── Path stats ─────────────────────────────────────────────────────────────────
public record PathStats(
    int visited,
    int pathLen,
    double cost,
    long computeTimeMs
) {}

// ── AI analysis response ───────────────────────────────────────────────────────
public record AiAnalysisResponse(
    String verdict,
    String recommendation,
    RouteDetail timeRoute,
    RouteDetail distRoute,
    String trafficInsight,
    String estimatedTimeSaving,
    String congestionLevel,
    String tip
) {
    public record RouteDetail(
        String summary,
        List<String> pros,
        List<String> cons
    ) {}
}

// ── Traffic map request ────────────────────────────────────────────────────────
public record TrafficMapRequest(String pattern) {}  // city | highway | random

// ── Traffic map response ───────────────────────────────────────────────────────
public record TrafficMapResponse(int[][] grid, int rows, int cols) {}

// ── Maze request ───────────────────────────────────────────────────────────────
public record MazeRequest(String type) {}           // recursive | prim | random

// ── Maze response ──────────────────────────────────────────────────────────────
public record MazeResponse(int[][] grid, int rows, int cols) {}
