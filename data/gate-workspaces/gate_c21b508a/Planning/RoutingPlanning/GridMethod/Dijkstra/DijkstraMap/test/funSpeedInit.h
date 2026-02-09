#ifndef FUN_SPEED_INIT_H
#define FUN_SPEED_INIT_H

#include <vector>
#include <cmath>

// Basic types for speed planning
typedef struct {
    double x;
    double y;
    double theta;
    double kappa;
    double s;
    double l;
    double dkappa;
    double v;
    double a;
    double relative_time;
} PlanningPoint;

typedef struct {
    std::vector<PlanningPoint> planningPoints;
} PlanningTrajectory;

// Prediction simulation (placeholder)
namespace prediction {
    struct PredictPoint {
        double x() const { return _x; }
        double y() const { return _y; }
        double _x, _y;
    };

    struct Object {
        double w() const { return _w; }
        double l() const { return _l; }
        PredictPoint predictpoint(int idx) const { return _points[idx]; }
        double _w, _l;
        std::vector<PredictPoint> _points;
    };

    struct ObjectList {
        const std::vector<Object>& object() const { return _objects; }
        std::vector<Object> _objects;
    };
}

// Param structs
typedef struct {
    int dummy;
} TrajSpeedInitParam;

typedef struct {
    PlanningTrajectory trajectory;
    prediction::ObjectList prediction;
    double current_speed;
    double target_speed;
} TrajSpeedInitInput;

typedef struct {
    PlanningTrajectory globalTrajectory;
} TrajSpeedInitOutput;

void initSpeedForTrajectory(const TrajSpeedInitParam &param, const TrajSpeedInitInput &input, TrajSpeedInitOutput &output);
void convertPathToTrajectory(const std::list<int>& pathNodes, const Map& map, PlanningTrajectory& outTrajectory);

// Helper structs for initSpeedForTrajectory
typedef struct {
    int dummy;
} GetMinObjDisParam;

typedef struct {
    PlanningPoint point;
    prediction::ObjectList prediction;
    double t;
} GetMinObjDisInput;

typedef struct {
    double distance;
} GetMinObjDisOutput;

void getMinDistanceOfPoint(const GetMinObjDisParam &param, const GetMinObjDisInput &input, GetMinObjDisOutput &output);

typedef struct {
    double maxspeed;
    double minspeed;
    double d1;
    double d2;
} SpeedModelParam;

typedef struct {
    double distance;
} SpeedModelInput;

typedef struct {
    double speed;
} SpeedModelOutput;

void speedModel(const SpeedModelParam &param, const SpeedModelInput &input, SpeedModelOutput &output);

typedef struct {
    int dummy;
} GetDistanceParam;

typedef struct {
    double x1; double y1;
    double x2; double y2;
} GetDistanceInput;

typedef struct {
    double distance;
} GetDistanceOutput;

void getDistance(const GetDistanceParam& param, const GetDistanceInput& input, GetDistanceOutput& output);

typedef struct {
    int dummy;
} FindMinParam;

typedef struct {
    std::vector<double> data;
} FindMinInput;

typedef struct {
    double flag;
} FindMinOutput;

void findMin(const FindMinParam &param, const FindMinInput &input, FindMinOutput &output);

#endif