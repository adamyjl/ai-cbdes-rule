/**
  **************************************************************************************
  * @file    mainRouter.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑地图路径规划测试主入口
  **************************************************************************************
  */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../Common/dataType.h"
#include "../include/mapAnalysis.h"
#include "../include/topoPathFinder.h"
#include <string>


/*
 * @brief 模块主入口函数
 * @cn_name 拓扑地图路径规划测试
 * @en_name executeTopologyPathPlanningTest
 * @type 函数
 * @retval int 执行状态码
 */
int executeTopologyPathPlanningTest(void)
{
    int ret = 0;
    MapAnalysisOutput mapOutput;
    MapAnalysisInput mapInput;
    MapAnalysisParam mapParam;
    PathFinderOutput pathOutput;
    PathFinderInput pathInput;
    PathFinderParam pathParam;
    int i = 0;

    /* 定义地图分析参数与输入输出 */
    /* 初始化地图文件路径 */
    strncpy(mapInput.filePath, "./roadMap(1).xodr", sizeof(mapInput.filePath));
    mapInput.filePath[sizeof(mapInput.filePath) - 1] = '\0';
    
    /* 执行地图分析 */
    ret = parseMapFile(&mapParam, &mapInput, &mapOutput);
    if (0 != ret) {
        printf("Error: parseMapFile failed.\n");
        return -1;
    }

    /* 定义路径规划参数与输入输出 */
    /* 设置起点和终点 */
    pathInput.originId = 3;
    pathInput.destinationId = 6;
    /* 将地图数据传递给路径规划器 */
    pathInput.map = mapOutput.targetMap;
    
    /* 执行路径搜索 */
    ret = findTopologyPath(&pathParam, &pathInput, &pathOutput);
    if (0 != ret) {
        printf("Error: findTopologyPath failed.\n");
        return -1;
    }

    /* 打印结果 */
    printf("Path found from %d to %d:\n", pathInput.originId, pathInput.destinationId);
    for (i = 0; i < pathOutput.pathSize; i = i + 1) {
        printf("Node ID: %d\n", pathOutput.pathNodes[i]);
    }

    return 0;
}

/*
 * @brief 主函数
 * @cn_name 主函数
 * @en_name main
 * @type 函数
 * @retval int 执行状态码
 */
int main(void)
{
    int result = 0;
    printf("Starting Topology Path Planning Test...\n");
    result = executeTopologyPathPlanningTest();
    printf("Test finished with code: %d\n", result);
    return result;
}