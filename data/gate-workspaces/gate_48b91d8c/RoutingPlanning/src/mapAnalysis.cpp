/**
  ******************************************************************************
  * @file    mapAnalysis.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   地图分析模块实现
  ******************************************************************************
  */

#include "../include/mapAnalysis.h"
#include <stdio.h>
#include <string.h>
#include <string>


/**
  * @brief 解析地图文件
  */
int parseMapFile(MapAnalysisParam *para, MapAnalysisInput *input, MapAnalysisOutput *output)
{
    int ret = 0;
    int i = 0;
    
    /* 模拟解析过程：直接初始化一个包含测试数据的地图 */
    /* Road 3 */
    output->targetMap.roads[0].id = 3;
    output->targetMap.roads[0].xBegin = 0.0;
    output->targetMap.roads[0].yBegin = 0.0;
    output->targetMap.roads[0].xEnd = 10.0;
    output->targetMap.roads[0].yEnd = 10.0;
    output->targetMap.roads[0].length = 14.14;
    output->targetMap.roads[0].laneCount = 1;
    output->targetMap.roads[0].lanes[0].id = 0;
    output->targetMap.roads[0].lanes[0].leftLaneId = -1;
    output->targetMap.roads[0].lanes[0].rightLaneId = -1;
    output->targetMap.roads[0].to[0] = 4; /* 连接到Road 4 */
    output->targetMap.roads[0].toCount = 1;

    /* Road 4 */
    output->targetMap.roads[1].id = 4;
    output->targetMap.roads[1].xBegin = 10.0;
    output->targetMap.roads[1].yBegin = 10.0;
    output->targetMap.roads[1].xEnd = 20.0;
    output->targetMap.roads[1].yEnd = 10.0;
    output->targetMap.roads[1].length = 10.0;
    output->targetMap.roads[1].laneCount = 1;
    output->targetMap.roads[1].lanes[0].id = 0;
    output->targetMap.roads[1].to[0] = 5; /* 连接到Road 5 */
    output->targetMap.roads[1].toCount = 1;

    /* Road 5 */
    output->targetMap.roads[2].id = 5;
    output->targetMap.roads[2].xBegin = 20.0;
    output->targetMap.roads[2].yBegin = 10.0;
    output->targetMap.roads[2].xEnd = 30.0;
    output->targetMap.roads[2].yEnd = 10.0;
    output->targetMap.roads[2].length = 10.0;
    output->targetMap.roads[2].laneCount = 1;
    output->targetMap.roads[2].lanes[0].id = 0;
    output->targetMap.roads[2].to[0] = 6; /* 连接到Road 6 */
    output->targetMap.roads[2].toCount = 1;

    /* Road 6 */
    output->targetMap.roads[3].id = 6;
    output->targetMap.roads[3].xBegin = 30.0;
    output->targetMap.roads[3].yBegin = 10.0;
    output->targetMap.roads[3].xEnd = 40.0;
    output->targetMap.roads[3].yEnd = 10.0;
    output->targetMap.roads[3].length = 10.0;
    output->targetMap.roads[3].laneCount = 1;
    output->targetMap.roads[3].lanes[0].id = 1;
    output->targetMap.roads[3].toCount = 0;

    output->targetMap.roadCount = 4;

    (void)para; /* 避免未使用参数警告 */
    (void)input;

    return ret;
}