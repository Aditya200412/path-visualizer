package com.pathfinder.model;

import jakarta.validation.constraints.NotNull;
import java.util.List;

record PathRequest(
    @NotNull int[][] grid,
    @NotNull int startRow,
    @NotNull int startCol,
    @NotNull int endRow,
    @NotNull int endCol,
    @NotNull String algorithm,
    @NotNull String mode
) {}

record PathResponse(
    List<int[]> visited,
    List<int[]> path,
    double cost,
    int visitedCount,
    int pathLength,
    long computeTimeMs,
    String algorithm,
    String mode
) {}

record CompareEntry(
    String algorithm,
    int visited,
    int pathLength,
    double cost,
    long computeTimeMs,
    boolean pathFound
) {}

record AiAnalysisRequest(
    @NotNull int[][] grid,
    List<int[]> pathTime,
    List<int[]> pathDist,
    PathStats statsTime,
    PathStats statsDist,
    String routeMode
) {}

record PathStats(
    int visited,
    int pathLen,
    double cost,
    long computeTimeMs
) {}

record AiAnalysisResponse(
    String verdict,
    String recommendation,
    RouteDetail timeRoute,
    RouteDetail distRoute,
    String trafficInsight,
    String estimatedTimeSaving,
    String congestionLevel,
    String tip
) {
    record RouteDetail(
        String summary,
        List<String> pros,
        List<String> cons
    ) {}
}

record TrafficMapRequest(String pattern) {}
record TrafficMapResponse(int[][] grid, int rows, int cols) {}
record MazeRequest(String type) {}
record MazeResponse(int[][] grid, int rows, int cols) {}
