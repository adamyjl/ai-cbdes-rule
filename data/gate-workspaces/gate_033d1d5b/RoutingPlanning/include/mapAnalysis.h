/**
  **************************************************************************************
  * @file    mapAnalysis.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   地图分析模块头文件
  **************************************************************************************
  */

#ifndef MAP_ANALYSIS_H
#define MAP_ANALYSIS_H

#include "../../Common/dataType.h"

/* 地图分析输入参数结构体 */
typedef struct {
    char filePath[256]; /* 地图文件路径 */
} MapAnalysisInput;

/* 地图分析输出参数结构体 */
typedef struct {
    Map targetMap; /* 解析后的地图数据 */
} MapAnalysisOutput;

/* 地图分析配置参数结构体 */
typedef struct {
    int dummy; /* 预留参数 */
} MapAnalysisParam;

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
int parseMapFile(MapAnalysisParam* para, MapAnalysisInput* input, MapAnalysisOutput* output);

#endif /* MAP_ANALYSIS_H */