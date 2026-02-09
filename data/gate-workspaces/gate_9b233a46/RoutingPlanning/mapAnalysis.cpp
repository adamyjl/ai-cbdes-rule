/**
  **************************************************************************************
  * @file    mapAnalysis.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   地图分析模块实现
  **************************************************************************************
  */

#include "mapAnalysis.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>
#include "dataType.h"
#include "dataType.h"


/**
  * @brief 解析地图文件
  */
int parseMapFile(MapAnalysisParam* param, MapAnalysisInput* input, MapAnalysisOutput* output)
{
    int ret = 0;
    FILE* fp = NULL;
    
    /* 检查输入指针有效性 */
    if ((NULL == input) || (NULL == output)) {
        ret = -1;
        return ret;
    }

    /* 打开文件 */
    fp = fopen(input->filePath, "r");
    if (NULL == fp) {
        printf("Error: Cannot open file %s\n", input->filePath);
        ret = -2;
        return ret;
    }

    /* 模拟解析过程：初始化地图数据 */
    /* 注意：此处为模拟数据，实际应读取xodr文件内容 */
    output->targetMap.roadCount = 2; /* 假设有2条路 */
    output->targetMap.roads = (Road*)malloc(sizeof(Road) * output->targetMap.roadCount);
    if (NULL == output->targetMap.roads) {
        ret = -3;
        fclose(fp);
        return ret;
    }

    /* 初始化道路3 */
    output->targetMap.roads[0].id = 3;
    output->targetMap.roads[0].laneCount = 1;
    output->targetMap.roads[0].lanes = (Lane*)malloc(sizeof(Lane) * output->targetMap.roads[0].laneCount);
    output->targetMap.roads[0].lanes[0].id = 0;
    output->targetMap.roads[0].lanes[0].length = 100.0;
    output->targetMap.roads[0].lanes[0].startPoint.x = 0.0;
    output->targetMap.roads[0].lanes[0].startPoint.y = 0.0;
    output->targetMap.roads[0].lanes[0].endPoint.x = 100.0;
    output->targetMap.roads[0].lanes[0].endPoint.y = 0.0;

    /* 初始化道路6 */
    output->targetMap.roads[1].id = 6;
    output->targetMap.roads[1].laneCount = 1;
    output->targetMap.roads[1].lanes = (Lane*)malloc(sizeof(Lane) * output->targetMap.roads[1].laneCount);
    output->targetMap.roads[1].lanes[0].id = 1;
    output->targetMap.roads[1].lanes[0].length = 100.0;
    output->targetMap.roads[1].lanes[0].startPoint.x = 100.0;
    output->targetMap.roads[1].lanes[0].startPoint.y = 0.0;
    output->targetMap.roads[1].lanes[0].endPoint.x = 200.0;
    output->targetMap.roads[1].lanes[0].endPoint.y = 0.0;

    fclose(fp);
    return 0;
}