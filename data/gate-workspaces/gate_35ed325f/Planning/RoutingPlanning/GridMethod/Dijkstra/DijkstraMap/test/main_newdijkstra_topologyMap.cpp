#include "../../include/dijkstraTopologyMap.h"
#include "../../include/localizationMapAnalysis.h"
#include <iostream>
#include <vector>

/**
 * @brief ä¸»å½æ°ï¼æ§è¡ææå°å¾è·¯å¾è§åæµè¯
 * @en_name Main Function for Topology Map Routing
 * @cn_name ææå°å¾è·¯å¾è§åæµè¯ä¸»å½æ°
 * @type Function
 * @param[in] æ 
 * @param[out] è¿åæ´æ°ç¶æç 
 * @var æ 
 * @retval int ç¨åºæ§è¡ç¶æ
 * @granularity Primary
 * @tag_level1 ä¸»ç¨åº
 * @tag_level2 æµè¯å¥å£
 * @formula æ 
 * @version 1.0
 * @date 2023-10-27
 * @author SystemArchitect
 */
int main()
{
    Map m;
    mapAnalysisPara para1;
    mapAnalysisInput input1{"./roadMap(1).xodr"};
    mapAnalysisOutput output1{m};
    
    mapAnalysis(para1, input1, output1);
    
    mapToAstarPara para2;
    mapToAstarInput input2;
    mapToAstarOutput output2;
    input2.m = output1.m;
    
    mapToAstar(para2, input2, output2);
    
    getPathPara para3;
    getPathInput input3{output2.A, 3, 6};
    getPathOutput output3;
    
    getPath(para3, input3, output3);
    
    findLanePara para4;
    findLaneInput input4{output1.m, output3.path, 3, 0, 6, 1};
    findLaneOutput output4{output2.A};
    
    findLane(para4, input4, output4);
    
    moduleSelfCheckPrintPara para5;
    moduleSelfCheckPrintInput input5{output2.A, output2.A.pathLanes};
    moduleSelfCheckPrintOutput output5;
    
    moduleSelfCheckPrint(para5, input5, output5);

    return 0;
}