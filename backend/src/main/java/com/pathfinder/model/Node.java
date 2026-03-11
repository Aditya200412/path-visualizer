package com.pathfinder.model;

/** Immutable grid coordinate. */
public record Node(int row, int col) {

    /** Manhattan distance heuristic to another node. */
    public double heuristic(Node other) {
        return Math.abs(this.row - other.row) + Math.abs(this.col - other.col);
    }

    @Override
    public String toString() {
        return row + "," + col;
    }
}
