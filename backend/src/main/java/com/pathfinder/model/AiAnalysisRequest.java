package com.pathfinder.model;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AiAnalysisRequest(
    @NotNull int[][] grid,
    List<int[]> pathTime,
    List<int[]> pathDist,
    PathStats statsTime,
    PathStats statsDist,
    String routeMode
) {}
