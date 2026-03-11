package com.pathfinder.model;
import jakarta.validation.constraints.NotNull;

public record PathRequest(
    @NotNull int[][] grid,
    @NotNull int startRow,
    @NotNull int startCol,
    @NotNull int endRow,
    @NotNull int endCol,
    @NotNull String algorithm,
    @NotNull String mode
) {}
