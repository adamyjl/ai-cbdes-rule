/**
  ******************************************************************************
  * @file    mapAnalysis.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   地图分析模块接口
  ******************************************************************************
  */

#ifndef MAP_ANALYSIS_H
#define MAP_ANALYSIS_H

#include "../../Common/dataType.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int dummy; ///< 占位参数
} MapAnalysisParam;

typedef struct {
    char filePath[256]; ///< 地图文件路径
} MapAnalysisInput;

typedef struct {
    Map targetMap; ///< 解析后的地图数据
} MapAnalysisOutput;

/**
  * @brief 解析地图文件
  * @param[in]  para  输入参数
  * @param[in]  input 输入数据
  * @param[out] output 输出数据
  * @retval 0 成功, 非0 失败
  */
int parseMapFile(MapAnalysisParam *para, MapAnalysisInput *input, MapAnalysisOutput *output);

#ifdef __cplusplus
}
#endif

#endif /* MAP_ANALYSIS_H */