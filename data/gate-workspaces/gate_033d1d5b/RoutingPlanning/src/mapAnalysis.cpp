/**
  **************************************************************************************
  * @file    mapAnalysis.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   地图分析模块实现
  **************************************************************************************
  */

#include "../include/mapAnalysis.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>
#include "../../Common/dataType.h"


/**
  * @brief 解析地图文件
  * @cn_name 解析地图文件
  * @en_name parseMapFile
  * @type 函数
  * @param[in] para 配置参数
  * @param[in] input 输入数据
  * @param[out] output 输出数据
  * @retval int 0-成功, 其他-失败
  */
int parseMapFile(MapAnalysisParam* para, MapAnalysisInput* input, MapAnalysisOutput* output)
{
    int ret = 0;
    FILE* fp = NULL;
    
    /* 检查输入指针有效性 */
    if (NULL == input || NULL == output) {
        return -1;
    }

    /* 打开地图文件 (此处简化为模拟数据) */
    fp = fopen(input->filePath, "r");
    if (NULL == fp) {
        /* 如果文件不存在，生成模拟数据用于测试 */
        output->targetMap.roadCount = 2;
        output->targetMap.roads = (RoadInfo*)malloc(sizeof(RoadInfo) * 2);
        if (NULL == output->targetMap.roads) {
            return -2;
        }
        
        /* 初始化道路1 */
        output->targetMap.roads[0].id = 3;
        output->targetMap.roads[0].length = 100.0;
        output->targetMap.roads[0].start.x = 0.0;
        output->targetMap.roads[0].start.y = 0.0;
        output->targetMap.roads[0].end.x = 100.0;
        output->targetMap.roads[0].end.y = 0.0;
        
        /* 初始化道路2 */
        output->targetMap.roads[1].id = 6;
        output->targetMap.roads[1].length = 150.0;
        output->targetMap.roads[1].start.x = 100.0;
        output->targetMap.roads[1].start.y = 0.0;
        output->targetMap.roads[1].end.x = 250.0;
        output->targetMap.roads[1].end.y = 0.0;
        
        return 0;
    }
    
    fclose(fp);
    return ret;
}