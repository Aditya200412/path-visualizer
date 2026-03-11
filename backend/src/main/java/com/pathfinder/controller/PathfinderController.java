package com.pathfinder.controller;

import com.pathfinder.model.*;
import com.pathfinder.service.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for the Pathfinding Visualizer.
 *
 * Base path: /api
 *
 * POST /api/path          – run a single algorithm
 * POST /api/path/compare  – run all 6 algorithms and compare
 * POST /api/ai/analyze    – Claude AI traffic route analysis
 * POST /api/map/traffic   – generate a traffic map
 * POST /api/map/maze      – generate a maze
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")   // tightened in production via SecurityConfig
public class PathfinderController {

    private final PathfindingService pathfindingService;
    private final MapGeneratorService mapGeneratorService;
    private final AiAnalysisService   aiAnalysisService;

    public PathfinderController(PathfindingService p, MapGeneratorService m, AiAnalysisService a) {
        this.pathfindingService = p;
        this.mapGeneratorService = m;
        this.aiAnalysisService = a;
    }

    // ── Pathfinding ────────────────────────────────────────────────────────────

    /** Solve with a single algorithm. */
    @PostMapping("/path")
    public ResponseEntity<PathResponse> solve(@Valid @RequestBody PathRequest req) {
        return ResponseEntity.ok(pathfindingService.solve(req));
    }

    /** Run all algorithms and return comparison table. */
    @PostMapping("/path/compare")
    public ResponseEntity<List<CompareEntry>> compareAll(@Valid @RequestBody PathRequest req) {
        return ResponseEntity.ok(pathfindingService.compareAll(req));
    }

    // ── AI Analysis ────────────────────────────────────────────────────────────

    @PostMapping("/ai/analyze")
    public ResponseEntity<AiAnalysisResponse> analyze(@RequestBody AiAnalysisRequest req) {
        return ResponseEntity.ok(aiAnalysisService.analyze(req));
    }

    // ── Map generators ─────────────────────────────────────────────────────────

    @PostMapping("/map/traffic")
    public ResponseEntity<TrafficMapResponse> generateTraffic(@RequestBody TrafficMapRequest req) {
        int[][] grid = mapGeneratorService.generateTrafficMap(req.pattern());
        return ResponseEntity.ok(new TrafficMapResponse(grid, grid.length, grid[0].length));
    }

    @PostMapping("/map/maze")
    public ResponseEntity<MazeResponse> generateMaze(@RequestBody MazeRequest req) {
        int[][] grid = mapGeneratorService.generateMaze(req.type());
        return ResponseEntity.ok(new MazeResponse(grid, grid.length, grid[0].length));
    }

    // ── Health ─────────────────────────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Pathfinder API is running ✓");
    }
}
