package com.pathfinder.model;
import java.util.List;

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
