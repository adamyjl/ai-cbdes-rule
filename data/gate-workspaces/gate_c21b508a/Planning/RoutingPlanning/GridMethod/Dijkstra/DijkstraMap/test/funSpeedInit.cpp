#include "funSpeedInit.h"
#include "funTopologyPathPlanning.h"
#include <iostream>
#include <cmath>
#include <algorithm>
#include <limits>

void getDistance(const GetDistanceParam& param, const GetDistanceInput& input, GetDistanceOutput& output){
    double x1 = input.x1;
    double x2 = input.x2;
    double y1 = input.y1;
    double y2 = input.y2;

    output.distance = sqrt(pow(x1 - x2, 2) + pow(y1 - y2, 2));
}

void findMin(const FindMinParam &param, const FindMinInput &input, FindMinOutput &output) {
    if (input.data.empty()) {
        output.flag = 100.0;
        return;
    }
    double minVal = input.data[0];
    for (size_t i = 1; i < input.data.size(); i++) {
        if (input.data[i] < minVal) {
            minVal = input.data[i];
        }
    }
    output.flag = minVal;
}

void getMinDistanceOfPoint(const GetMinObjDisParam &param, const GetMinObjDisInput &input, GetMinObjDisOutput &output){
    PlanningPoint point = input.point;
    prediction::ObjectList prediction = input.prediction;
    double t = input.t;

    int index;
    double tRemainder;
    PlanningPoint predictTempPoint;
    std::vector<double> distanceFromObject;
    
    int predictFrequency = 1; // Default frequency
    index = (int)t / predictFrequency;
    tRemainder = t - index * predictFrequency;

    if (index >= 19){
        output.distance = 100;
        return;
    }

    for (auto object : prediction.object()){
        if (index + 1 >= object._points.size()) continue;

        predictTempPoint.x = object.predictpoint(index).x() * (1 - tRemainder) + object.predictpoint(index + 1).x() * tRemainder;
        predictTempPoint.y = object.predictpoint(index).y() * (1 - tRemainder) + object.predictpoint(index + 1).y() * tRemainder;
        
        GetDistanceParam param4;
        GetDistanceInput input4{
            point.x,
            point.y,
            predictTempPoint.x + object.w() / 2,
            predictTempPoint.y + object.l() / 2
        };
        GetDistanceOutput output4{0};
        getDistance(param4, input4, output4);

        GetDistanceParam param5;
        GetDistanceInput input5{
            point.x,
            point.y,
            predictTempPoint.x - object.w() / 2,
            predictTempPoint.y + object.l() / 2
        };
        GetDistanceOutput output5{0};
        getDistance(param5, input5, output5);

        GetDistanceParam param6;
        GetDistanceInput input6{
            point.x,
            point.y,
            predictTempPoint.x + object.w() / 2,
            predictTempPoint.y - object.l() / 2
        };
        GetDistanceOutput output6{0};
        getDistance(param6, input6, output6);    

        GetDistanceParam param7;
        GetDistanceInput input7{
            point.x,
            point.y,
            predictTempPoint.x - object.w() / 2,
            predictTempPoint.y -object.l() / 2
        };
        GetDistanceOutput output7{0};
        getDistance(param7, input7, output7);

        distanceFromObject.push_back(output4.distance);
        distanceFromObject.push_back(output5.distance);
        distanceFromObject.push_back(output6.distance);
        distanceFromObject.push_back(output7.distance);
    }

    if(distanceFromObject.size() > 0){
        FindMinParam param1;
        FindMinInput input1 = {distanceFromObject};
        FindMinOutput output1 = {0};
        findMin(param1, input1, output1);
        output.distance = output1.flag;

        return;
    }
    else{
        output.distance = 100;
        return;
    } 
}

void speedModel(const SpeedModelParam &param, const SpeedModelInput &input, SpeedModelOutput &output){
    double distance = input.distance;
    double maxspeed = param.maxspeed;
    double minspeed = param.minspeed;
    double d1 = param.d1;
    double d2 = param.d2;

    if (distance < 0)
    {
        output.speed = minspeed;
        return;
    }

    if (distance < d2)
    {
        output.speed = minspeed;
        return;
    }
    else if (distance > d1)
    {
        output.speed = maxspeed;
        return;
    }
    else
    {
        output.speed = minspeed + (maxspeed - minspeed) * (distance - d2) / (d1 - d2);
        return;
    }
}

void initSpeedForTrajectory(const TrajSpeedInitParam &param, const TrajSpeedInitInput &input, TrajSpeedInitOutput &output){
    PlanningTrajectory trajectory = input.trajectory;
    prediction::ObjectList prediction = input.prediction;

    int i = 0;
    double t = 0;
    double distance;
    bool stopFlag = false;
    
    // Default speed model parameters
    SpeedModelParam speedParam;
    speedParam.maxspeed = 15.0; // m/s
    speedParam.minspeed = 0.0;
    speedParam.d1 = 50.0;
    speedParam.d2 = 10.0;

    for (i = 0; i < (int)trajectory.planningPoints.size() - 1; i++)
    {
        GetMinObjDisParam param1;
        GetMinObjDisInput input1{
            trajectory.planningPoints[i], 
            prediction, 
            t
        };
        GetMinObjDisOutput output1{0};
        getMinDistanceOfPoint(param1, input1, output1);
        distance = output1.distance;

        SpeedModelInput input2{distance};
        SpeedModelOutput output2{0};
        speedModel(speedParam, input2, output2);
        trajectory.planningPoints[i].v = output2.speed;

        if (trajectory.planningPoints[i].v > 0){
            GetDistanceParam param3;
            GetDistanceInput input3{
                trajectory.planningPoints[i].x,
                trajectory.planningPoints[i].y,
                trajectory.planningPoints[i+1].x,
                trajectory.planningPoints[i+1].y
            };
            GetDistanceOutput output3{0};
            getDistance(param3, input3, output3);

            t += output3.distance / trajectory.planningPoints[i].v;
        }
        else{
            stopFlag = true;
            break;
        }
    }
    if (stopFlag)
    {
        for (; i < (int)trajectory.planningPoints.size(); i++)
        {
            trajectory.planningPoints[i].v = 0;
        }
    }
    else
    {
        if (i < (int)trajectory.planningPoints.size()) {
            trajectory.planningPoints[i].v = trajectory.planningPoints[i-1].v;
        }
    }

    output.globalTrajectory = trajectory;
}

void convertPathToTrajectory(const std::list<int>& pathNodes, const Map& map, PlanningTrajectory& outTrajectory) {
    // Simple converter: map node IDs to points from the map data
    outTrajectory.planningPoints.clear();
    
    for (int roadId : pathNodes) {
        PlanningPoint pt;
        pt.x = 0.0;
        pt.y = 0.0;
        pt.theta = 0.0;
        pt.kappa = 0.0;
        pt.s = 0.0;
        pt.l = 0.0;
        pt.dkappa = 0.0;
        pt.v = 5.0; // Default speed
        pt.a = 0.0;
        pt.relative_time = 0.0;

        // Try to find the road in the map to get coordinates
        for (const auto& road : map.roads) {
            if (road.id == roadId && !road.lanes.empty() && !road.lanes[0].gaussRoadPoints.empty()) {
                // Use the start point of the first lane
                pt.x = road.lanes[0].gaussRoadPoints[0].GaussX;
                pt.y = road.lanes[0].gaussRoadPoints[0].GaussY;
                pt.theta = road.lanes[0].gaussRoadPoints[0].yaw;
                pt.kappa = road.lanes[0].gaussRoadPoints[0].curvature;
                break;
            }
        }
        outTrajectory.planningPoints.push_back(pt);
    }
}