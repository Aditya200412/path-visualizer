package com.pathfinder.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pathfinder.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

/**
 * Sends traffic context to Claude API and parses structured analysis response.
 */
@Service
public class AiAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisService.class);
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL      = "claude-sonnet-4-20250514";

    private final WebClient webClient;
    private final ObjectMapper mapper;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    public AiAnalysisService(ObjectMapper mapper) {
        this.mapper = mapper;
        this.webClient = WebClient.builder()
            .baseUrl(CLAUDE_URL)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public AiAnalysisResponse analyze(AiAnalysisRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallbackResponse("ANTHROPIC_API_KEY not set in environment.");
        }

        // ── Build traffic summary ──────────────────────────────────────────
        Map<String, Integer> tc = trafficCount(req.grid());
        int pAjam  = countCells(req.pathTime(), req.grid(), 11);
        int pBjam  = countCells(req.pathDist(), req.grid(), 11);
        int pAhigh = countCells(req.pathTime(), req.grid(), 10);
        int pBhigh = countCells(req.pathDist(), req.grid(), 10);

        String prompt = buildPrompt(tc, req.statsTime(), req.statsDist(),
            pAjam, pBjam, pAhigh, pBhigh, req.routeMode());

        // ── Call Claude ────────────────────────────────────────────────────
        try {
            Map<String, Object> body = Map.of(
                "model",      MODEL,
                "max_tokens", 900,
                "messages",   List.of(Map.of("role", "user", "content", prompt))
            );

            String raw = webClient.post()
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            return parseResponse(raw);

        } catch (Exception ex) {
            log.error("Claude API call failed: {}", ex.getMessage());
            return fallbackResponse("AI service temporarily unavailable.");
        }
    }

    // ── Prompt builder ─────────────────────────────────────────────────────────
    private String buildPrompt(Map<String,Integer> tc, PathStats sT, PathStats sD,
                               int pAjam, int pBjam, int pAhigh, int pBhigh, String mode) {
        return """
            You are an expert traffic routing analyst embedded in a pathfinding visualizer.

            GRID TRAFFIC SUMMARY:
            Jams (×15 time): %d cells | Heavy (×6): %d cells | Moderate (×3): %d cells | Light (×1.5): %d cells | Blocked: %d cells

            TIME-OPTIMISED ROUTE (A* with traffic weights):
            Length=%d  WeightedCost=%.2f  NodesExplored=%d  JamCells=%d  HeavyCells=%d

            DISTANCE-OPTIMISED ROUTE (A* ignoring traffic):
            Length=%d  WeightedCost=%.2f  NodesExplored=%d  JamCells=%d  HeavyCells=%d

            Current user mode: %s

            Reply ONLY with valid JSON, zero markdown, zero extra text:
            {"verdict":"TIME_WINS|DISTANCE_WINS|TIED","recommendation":"one concise sentence",
            "timeRoute":{"summary":"sentence","pros":["p1","p2"],"cons":["c1"]},
            "distRoute":{"summary":"sentence","pros":["p1"],"cons":["c1","c2"]},
            "trafficInsight":"expert insight sentence",
            "estimatedTimeSaving":"e.g. ~8 min faster or similar times",
            "congestionLevel":"LOW|MODERATE|HIGH|CRITICAL",
            "tip":"practical routing tip"}
            """.formatted(
                tc.getOrDefault("jam",0), tc.getOrDefault("high",0),
                tc.getOrDefault("med",0), tc.getOrDefault("low",0), tc.getOrDefault("walls",0),
                sT != null ? sT.pathLen()  : 0,
                sT != null ? sT.cost()     : 0.0,
                sT != null ? sT.visited()  : 0,
                pAjam, pAhigh,
                sD != null ? sD.pathLen()  : 0,
                sD != null ? sD.cost()     : 0.0,
                sD != null ? sD.visited()  : 0,
                pBjam, pBhigh,
                mode
            );
    }

    // ── Response parser ────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private AiAnalysisResponse parseResponse(String raw) throws Exception {
        Map<String, Object> envelope = mapper.readValue(raw, Map.class);
        List<Map<String,Object>> content = (List<Map<String,Object>>) envelope.get("content");
        String text = content.stream()
            .filter(b -> "text".equals(b.get("type")))
            .map(b -> (String) b.get("text"))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No text block in response"));

        // Strip any accidental markdown fences
        text = text.replaceAll("```json|```", "").strip();
        Map<String,Object> json = mapper.readValue(text, Map.class);

        return new AiAnalysisResponse(
            str(json, "verdict"),
            str(json, "recommendation"),
            toRouteDetail((Map<String,Object>) json.get("timeRoute")),
            toRouteDetail((Map<String,Object>) json.get("distRoute")),
            str(json, "trafficInsight"),
            str(json, "estimatedTimeSaving"),
            str(json, "congestionLevel"),
            str(json, "tip")
        );
    }

    @SuppressWarnings("unchecked")
    private AiAnalysisResponse.RouteDetail toRouteDetail(Map<String,Object> m) {
        if (m == null) return new AiAnalysisResponse.RouteDetail("N/A", List.of(), List.of());
        return new AiAnalysisResponse.RouteDetail(
            str(m, "summary"),
            (List<String>) m.getOrDefault("pros", List.of()),
            (List<String>) m.getOrDefault("cons", List.of())
        );
    }

    private String str(Map<String,Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString() : "";
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    private Map<String,Integer> trafficCount(int[][] grid) {
        Map<String,Integer> tc = new HashMap<>(Map.of("jam",0,"high",0,"med",0,"low",0,"walls",0));
        for (int[] row : grid)
            for (int cell : row) {
                if      (cell == 11) tc.merge("jam",   1, Integer::sum);
                else if (cell == 10) tc.merge("high",  1, Integer::sum);
                else if (cell ==  9) tc.merge("med",   1, Integer::sum);
                else if (cell ==  8) tc.merge("low",   1, Integer::sum);
                else if (cell ==  1) tc.merge("walls", 1, Integer::sum);
            }
        return tc;
    }

    private int countCells(List<int[]> path, int[][] grid, int cellValue) {
        if (path == null) return 0;
        return (int) path.stream().filter(p -> grid[p[0]][p[1]] == cellValue).count();
    }

    private AiAnalysisResponse fallbackResponse(String reason) {
        var detail = new AiAnalysisResponse.RouteDetail(reason, List.of(), List.of());
        return new AiAnalysisResponse("TIED", reason, detail, detail,
            "Set ANTHROPIC_API_KEY to enable AI analysis.",
            "N/A", "UNKNOWN", "Add your API key to the Render environment variables.");
    }
}
