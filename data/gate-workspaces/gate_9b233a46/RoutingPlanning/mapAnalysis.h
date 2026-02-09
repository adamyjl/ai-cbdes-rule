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

#include "dataType.h"

#ifdef __cplusplus
extern "C" {
#endif

/* @brief 地图分析参数 */
typedef struct {
    int dummy; /* 占位符 */
} MapAnalysisParam;

/* @brief 地图分析输入 */
typedef struct {
    char filePath[256]; /* 地图文件路径 */
} MapAnalysisInput;

/* @brief 地图分析输出 */
typedef struct {
    Map targetMap; /* 解析后的地图数据 */
} MapAnalysisOutput;

/**
  * @brief 解析地图文件
  * @param[in]  param 参数
  * @param[in]  input 输入
  * @param[out] output 输出
  * @retval int 0成功 非0失败
  */
int parseMapFile(MapAnalysisParam* param, MapAnalysisInput* input, MapAnalysisOutput* output);

#ifdef __cplusplus
}
#endif

#endif /* MAP_ANALYSIS_H */