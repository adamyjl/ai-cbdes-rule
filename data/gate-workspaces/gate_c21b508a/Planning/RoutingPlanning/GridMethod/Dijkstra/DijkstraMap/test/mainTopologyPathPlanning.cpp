/**
 * @file mainTopologyPathPlanning.cpp
 * @brief ææå°å¾è·¯å¾è§åä¸éåº¦è§åèåæµè¯ä¸»ç¨åº
 */

#include <iostream>
#include <vector>
#include <cmath>
#include <cstring>
#include <cstdlib>

#include "rapidxml.hpp"
#include "rapidxml_utils.hpp"
#include "funTopologyPathPlanning.h"
#include "funSpeedInit.h"

using namespace std;
using namespace rapidxml;

/**
 * @brief ä¸»å½æ°ï¼æ§è¡ææå°å¾è·¯å¾è§åå¹¶è½¬æ¢è³éåº¦è§åè¾å¥
 * @return int ç¨åºæ§è¡ç¶æç 
 * @details æ´åå°å¾è§£æãA*è·¯å¾æç´¢ãè½¦éå¹éåéåº¦è§ååå§åæµç¨
 * @author System
 * @date 2023-10-27
 */
int main()
{
    Map mapObj;
    mapAnalysisPara paraMap;
    mapAnalysisInput inputMap{"./roadMap(1).xodr"};
    mapAnalysisOutput outputMap{mapObj};
    
    /**
     * @brief è§£æOpenDRIVEå°å¾æä»¶
     * @details å°XMLæ ¼å¼çå°å¾æ°æ®è§£æä¸ºåå­ä¸­çMapç»æä½
     */
    mapAnalysis(paraMap, inputMap, outputMap);

    Astar astarObj;
    mapToAstarPara paraAstar;
    mapToAstarInput inputAstar;
    mapToAstarOutput outputAstar;
    inputAstar.m = outputMap.m;
    
    /**
     * @brief å°Mapç»æè½¬æ¢ä¸ºA*ç®æ³æéçé»æ¥è¡¨æ ¼å¼
     * @details åå§åè·¯ç½èç¹ä¸è¿æ¥å³ç³»
     */
    mapToAstar(paraAstar, inputAstar, outputAstar);

    getPathPara paraPath;
    getPathInput inputPath{outputAstar.A, 3, 6};
    getPathOutput outputPath;
    
    /**
     * @brief ä½¿ç¨A*ç®æ³è®¡ç®å¨å±è·¯å¾
     * @details ä»èç¹3å°èç¹6çæä¼éè·¯åºå
     */
    getPath(paraPath, inputPath, outputPath);

    findLanePara paraLane;
    findLaneInput inputLane{outputMap.m, outputPath.path, 3, 0, 6, 1};
    findLaneOutput outputLane{outputAstar.A};
    
    /**
     * @brief åºäºè·¯å¾å¹éå·ä½è½¦é
     * @details ç¡®å®æ¯ä¸æ¡éè·¯ä¸çå·ä½è¡é©¶è½¦é
     */
    findLane(paraLane, inputLane, outputLane);

    moduleSelfCheckPrintPara paraPrint;
    moduleSelfCheckPrintInput inputPrint{outputAstar.A, outputAstar.A.pathLanes};
    moduleSelfCheckPrintOutput outputPrint;
    
    /**
     * @brief æå°è·¯å¾è§åç»æèªæ£ä¿¡æ¯
     * @details è¾åºåå«éè·¯IDä¸è½¦éIDçå®æ´è·¯å¾åºå
     */
    moduleSelfCheckPrint(paraPrint, inputPrint, outputPrint);

    // --- éåº¦è§ååå§åæ¥å£è¡æ¥ ---
    
    TrajSpeedInitParam paramSpeed;
    TrajSpeedInitInput inputSpeed;
    TrajSpeedInitOutput outputSpeed;
    
    /**
     * @brief å°è·¯å¾è§åçèç¹åºåè½¬æ¢ä¸ºéåº¦è§åçè½¨è¿¹ç¹
     * @details æ å°è·¯ç½èç¹è³ç©çåæ ï¼çæåå§è½¨è¿¹
     */
    convertPathToTrajectory(outputPath.path, outputMap.m, inputSpeed.trajectory);

    // æ¨¡æé¢æµæ°æ®ï¼å®éåºç¨ä¸­åºæ¥æ¶ Perception æ¨¡åè¾åºï¼
    prediction::ObjectList prediction;
    inputSpeed.prediction = prediction;
    inputSpeed.current_speed = 0.0;
    inputSpeed.target_speed = 15.0;
    
    /**
     * @brief åå§åè½¨è¿¹éåº¦
     * @details æ ¹æ®éç¢ç©è·ç¦»è®¡ç®æ²¿è½¨è¿¹çåå§éåº¦åå¸
     */
    initSpeedForTrajectory(paramSpeed, inputSpeed, outputSpeed);

    cout << "Speed planning initialized. Trajectory points: " << outputSpeed.globalTrajectory.planningPoints.size() << endl;

    return 0;
}