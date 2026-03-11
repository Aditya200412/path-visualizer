package com.pathfinder.model;
import java.util.List;

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
