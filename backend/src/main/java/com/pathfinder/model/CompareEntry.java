package com.pathfinder.model;

public record CompareEntry(
    String algorithm,
    int visited,
    int pathLength,
    double cost,
    long computeTimeMs,
    boolean pathFound
) {}
