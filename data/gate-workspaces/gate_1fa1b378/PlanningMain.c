/**
 * @file PlanningMain.c
 * @brief è§åæ¨¡åä¸»å¥å£
 */

#include <stdio.h>
#include "RoutingPlanning/TopologyMap/TopologyMap.h"
#include "SpeedPlanning/TrajectorySpeedInit/TrajectorySpeedInit.h"

/**
 * @brief æ¨¡æçæè½¨è¿¹ç¹
 * @details ç¨äºçææµè¯ç¨çè½¨è¿¹æ°æ®
 * @param[in] pathNodes è·¯å¾èç¹
 * @param[in] nodeNum èç¹æ°é
 * @param[out] trajectory è¾åºè½¨è¿¹
 * @retval void
 * @author system
 * @date 2023-10-27
 */
void generateTrajectoryFromPath(const int* pathNodes, const int nodeNum, PlanningTrajectory* trajectory)
{
    int i = 0;
    int j = 0;
    int stepsPerNode = 20;
    
    trajectory->pointCount = nodeNum * stepsPerNode;
    if (trajectory->pointCount > MAX_TRAJECTORY_POINTS)
    {
        trajectory->pointCount = MAX_TRAJECTORY_POINTS;
    }
    
    /* æ ¹æ®èç¹IDçæç®åçç´çº¿è½¨è¿¹ */
    for (i = 0; i < trajectory->pointCount; i++)
    {
        trajectory->points[i].x = (double)i;
        trajectory->points[i].y = 0.0;
        trajectory->points[i].theta = 0.0;
        trajectory->points[i].kappa = 0.0;
        trajectory->points[i].s = (double)i;
        trajectory->points[i].v = 0.0; /* å¾åå§å */
    }
}

/**
 * @brief ä¸»å½æ°
 * @brief Main Entry
 * @details æ´åè·¯å¾è§åä¸éåº¦è§åæµç¨
 * @param[in] argc åæ°ä¸ªæ°
 * @param[in] argv åæ°åè¡¨
 * @retval int ç¶æç 
 * @author system
 * @date 2023-10-27
 */
int main(int argc, const char* argv[])
{
    (void)argc;
    (void)argv;
    
    /* 1. è·¯å¾è§åé¨å */
    TopoPlanningParam routeParam;
    TopoPlanningInput routeInput;
    TopoPlanningOutput routeOutput;
    
    routeInput.startRoadId = 0;
    routeInput.endRoadId = 2;
    routeInput.mapPath = "./roadMap.xodr"; /* æ¨¡æè·¯å¾ */
    
    printf("Start Topology Map Path Planning...\n");
    runTopologyMapPlanning(&routeParam, &routeInput, &routeOutput);
    
    if (0 != routeOutput.result)
    {
        printf("Route planning failed.\n");
        return -1;
    }
    
    /* 2. éåº¦è§åé¨å */
    SpeedInitParam speedParam;
    SpeedInitInput speedInput;
    SpeedInitOutput speedOutput;
    
    /* åå§ååæ° */
    speedParam.maxSpeed = 15.0;
    speedParam.minSpeed = 0.0;
    speedParam.d1 = 50.0;
    speedParam.d2 = 10.0;
    speedParam.predictFrequency = 0.1;
    
    /* çæè½¨è¿¹ (è·¯å¾è½¬è½¨è¿¹) */
    generateTrajectoryFromPath(routeOutput.pathNodes, routeOutput.pathLen, &speedInput.trajectory);
    
    /* æ¨¡æéç¢ç©é¢æµ (æ¸ç©ºè¡¨ç¤ºæ éç¢ç©) */
    speedInput.prediction.objCount = 0;
    
    printf("Start Trajectory Speed Initialization...\n");
    runTrajectorySpeedInit(&speedParam, &speedInput, &speedOutput);
    
    /* æå°é¨åç»æ */
    printf("Speed Planning Result (first 10 points):\n");
    int i = 0;
    for (i = 0; i < 10; i++)
    {
        printf("Point %d: v = %.2f\n", i, speedOutput.trajectory.points[i].v);
    }
    
    printf("Planning Finished.\n");
    
    return 0;
}