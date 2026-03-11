package com.pathfinder.model;

public record PathStats(
    int visited,
    int pathLen,
    double cost,
    long computeTimeMs
) {}
