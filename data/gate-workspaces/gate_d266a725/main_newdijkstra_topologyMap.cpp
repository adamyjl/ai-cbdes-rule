/**
 * @file main_newdijkstra_topologyMap.cpp
 * @brief ææå°å¾è·¯å¾è§åä¸éåº¦è§åä¸»ç¨åº
 * @details æ¬ç¨åºæ§è¡åºäºææå°å¾çè·¯å¾è§åï¼å¹¶å°è·¯å¾ç»æè½¬æ¢ä¸ºéåº¦è§åæéçè½¨è¿¹è¾å¥ï¼æç»è¾åºè§åç»æã
 */

#include <iostream>
#include <vector>
#include <cmath>
#include <string>
#include "rapidxml.hpp"
#include "rapidxml_utils.hpp"
#include "localization_MapAnalysis.h"
#include "dijkstra_topologyMap.h"
#include "initTrajectorySpeed.h"

using namespace std;

/**
 * @brief å°è·¯å¾èç¹åè¡¨è½¬æ¢ä¸ºè½¨è¿¹ç¹éåçè½¬æ¢å½æ°
 * @details è·¯å¾è§åè¾åºçèç¹IDåè¡¨éè¦æ å°ä¸ºå·ä½çç©çåæ åå ä½å±æ§ï¼ä»¥ä¾éåº¦è§åæ¨¡åä½¿ç¨ã
 * @param [IN] originRoad èµ·å§éè·¯ID
 * @param [IN] originLane èµ·å§è½¦éID
 * @param [IN] destinationRoad ç®æ éè·¯ID
 * @param [IN] destinationLane ç®æ è½¦éID
 * @param [IN] m å°å¾å¯¹è±¡ï¼åå«éè·¯åè½¦éä¿¡æ¯
 * @param [IN] pathNodeIds è·¯å¾èç¹IDåè¡¨
 * @param [OUT] trajectoryPoints çæçè½¨è¿¹ç¹éå
 * @return int æ§è¡ç¶æç ï¼0è¡¨ç¤ºæå
 * @retval 0 æå
 * @retval -1 å¤±è´¥
 */
int convertPathToTrajectory(int originRoad, int originLane, int destinationRoad, int destinationLane, Map m, vector<int> pathNodeIds, vector<PlanningPoint>& trajectoryPoints)
{
    int i = 0;
    int j = 0;
    int k = 0;
    double currentX = 0.0;
    double currentY = 0.0;
    double currentTheta = 0.0;
    double currentKappa = 0.0;
    double currentS = 0.0;
    double currentL = 0.0;
    double currentDkappa = 0.0;
    int roadSize = (int)m.roads.size();
    int pathSize = (int)pathNodeIds.size();
    int pointCount = 0;
    int laneSize = 0;
    int roadPointCount = 0;
    GaussRoadPoint roadPointTemp;
    PlanningPoint pointTemp;

    if (pathSize == 0)
    {
        return -1;
    }

    for (i = 0; i < pathSize; i = i + 1)
    {
        for (j = 0; j < roadSize; j = j + 1)
        {
            if (m.roads[j].id == pathNodeIds[i])
            {
                laneSize = (int)m.roads[j].lanes.size();
                for (k = 0; k < laneSize; k = k + 1)
                {
                    if (m.roads[j].lanes[k].id == originLane)
                    {
                        roadPointCount = (int)m.roads[j].lanes[k].gaussRoadPoints.size();
                        for (pointCount = 0; pointCount < roadPointCount; pointCount = pointCount + 1)
                        {
                            roadPointTemp = m.roads[j].lanes[k].gaussRoadPoints[pointCount];
                            currentX = roadPointTemp.GaussX;
                            currentY = roadPointTemp.GaussY;
                            currentTheta = roadPointTemp.yaw;
                            currentKappa = roadPointTemp.curvature;
                            currentS = currentS + 1.0; // ç®åå¤çï¼ç´¯å è·ç¦»
                            currentL = 0.0;
                            currentDkappa = 0.0;

                            pointTemp.x = currentX;
                            pointTemp.y = currentY;
                            pointTemp.theta = currentTheta;
                            pointTemp.kappa = currentKappa;
                            pointTemp.s = currentS;
                            pointTemp.l = currentL;
                            pointTemp.dkappa = currentDkappa;
                            pointTemp.v = 0.0; // åå§éåº¦ä¸º0

                            trajectoryPoints.push_back(pointTemp);
                        }
                    }
                }
            }
        }
    }

    return 0;
}

/**
 * @brief ä¸»å½æ°ï¼æ§è¡å®æ´çè§åæµç¨
 * @details 1. è§£æå°å¾ï¼2. æå»ºA*å¾ï¼3. æç´¢è·¯å¾ï¼4. æ å°è½¦éï¼5. è½¬æ¢è½¨è¿¹ï¼6. åå§åéåº¦ã
 * @return int ç¨åºéåºç 
 * @retval 0 æ­£å¸¸éåº
 */
int main()
{
    int originRoad = 3;
    int originLane = 0;
    int destinationRoad = 6;
    int destinationLane = 1;
    int status = 0;

    Map m;
    mapAnalysisPara para1;
    mapAnalysisInput input1{"./roadMap(1).xodr"};
    mapAnalysisOutput output1{m};

    // æ§è¡å°å¾åæ
    mapAnalysis(para1, input1, output1);

    mapToAstarPara para2;
    mapToAstarInput input2;
    mapToAstarOutput output2;
    input2.m = output1.m;

    // æå»ºA*æç´¢å¾
    mapToAstar(para2, input2, output2);

    getPathPara para3;
    getPathInput input3{output2.A, originRoad, destinationRoad};
    getPathOutput output3;

    // è·åè·¯å¾èç¹
    getPath(para3, input3, output3);

    findLanePara para4;
    findLaneInput input4{output1.m, output3.path, originRoad, originLane, destinationRoad, destinationLane};
    findLaneOutput output4{output2.A};

    // æ å°å·ä½è½¦é
    findLane(para4, input4, output4);

    // æå°è·¯å¾æ£æ¥ç»æ
    moduleSelfCheckPrintPara para5;
    moduleSelfCheckPrintInput input5{output2.A, output2.A.pathLanes};
    moduleSelfCheckPrintOutput output5;
    moduleSelfCheckPrint(para5, input5, output5);

    // å°è·¯å¾è½¬æ¢ä¸ºè½¨è¿¹ç¹
    vector<int> pathNodeIds(output3.path.begin(), output3.path.end());
    vector<PlanningPoint> trajectoryPoints;
    status = convertPathToTrajectory(originRoad, originLane, destinationRoad, destinationLane, output1.m, pathNodeIds, trajectoryPoints);

    if (status == 0 && !trajectoryPoints.empty())
    {
        PlanningTrajectory PT{trajectoryPoints};

        // åå¤éåº¦è§åè¾å¥
        TrajSpeedInitParam speedParam;
        speedParam.predictFrequency = 0.1; // é¢æµé¢ç
        speedParam.maxspeed = 20.0;         // æå¤§éåº¦ m/s
        speedParam.minspeed = 0.0;          // æå°éåº¦ m/s
        speedParam.d1 = 50.0;               // è·ç¦»éå¼1
        speedParam.d2 = 10.0;               // è·ç¦»éå¼2

        prediction::ObjectList predictionInput; // åè®¾ä¸ºç©ºï¼å®ééå¡«åé¢æµæ°æ®
        TrajSpeedInitInput speedInput{PT, predictionInput};
        TrajSpeedInitOutput speedOutput{PT};

        // æ§è¡è½¨è¿¹éåº¦åå§å
        initSpeedForTrajectory(speedParam, speedInput, speedOutput);

        cout << "Speed Planning Result:" << endl;
        for (int i = 0; i < (int)speedOutput.globalTrajectory.planningPoints.size(); i = i + 1)
        {
            cout << "Point " << i << ": V=" << speedOutput.globalTrajectory.planningPoints[i].v << endl;
        }
    }
    else
    {
        cout << "Path to Trajectory conversion failed." << endl;
    }

    return 0;
}