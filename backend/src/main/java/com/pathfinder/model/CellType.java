package com.pathfinder.model;

public enum CellType {
    EMPTY(0),
    WALL(1),
    START(2),
    END(3),
    TRAFFIC_LOW(8),
    TRAFFIC_MED(9),
    TRAFFIC_HIGH(10),
    TRAFFIC_JAM(11),
    WEIGHT_2(12),
    WEIGHT_3(13),
    WEIGHT_5(14);

    private final int value;

    CellType(int value) { this.value = value; }
    public int getValue() { return value; }

    public static CellType fromValue(int v) {
        for (CellType c : values()) if (c.value == v) return c;
        return EMPTY;
    }

    /** Cost used by time-optimised routing (traffic matters a lot) */
    public double timeCost() {
        return switch (this) {
            case WALL        -> Double.MAX_VALUE;
            case TRAFFIC_LOW -> 1.5;
            case TRAFFIC_MED -> 3.0;
            case TRAFFIC_HIGH-> 6.0;
            case TRAFFIC_JAM -> 15.0;
            case WEIGHT_2    -> 2.0;
            case WEIGHT_3    -> 3.0;
            case WEIGHT_5    -> 5.0;
            default          -> 1.0;
        };
    }

    /** Cost used by distance-optimised routing (traffic barely matters) */
    public double distCost() {
        return switch (this) {
            case WALL        -> Double.MAX_VALUE;
            case TRAFFIC_LOW -> 1.1;
            case TRAFFIC_MED -> 1.2;
            case TRAFFIC_HIGH-> 1.3;
            case TRAFFIC_JAM -> 1.5;
            case WEIGHT_2    -> 2.0;
            case WEIGHT_3    -> 3.0;
            case WEIGHT_5    -> 5.0;
            default          -> 1.0;
        };
    }
}
