/**
  **************************************************************************************
  * @file    topoPathFinder.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径搜索模块头文件
  **************************************************************************************
  */

#ifndef TOPO_PATH_FINDER_H
#define TOPO_PATH_FINDER_H

#include "dataType.h"

#ifdef __cplusplus
extern "C" {
#endif

/* 最大路径节点数 */
#define MAX_PATH_NODES 64

/* @brief 路径规划参数 */
typedef struct {
    int dummy; /* 占位符 */
} PathFinderParam;

/* @brief 路径规划输入 */
typedef struct {
    int originId; /* 起点Road ID */
    int destinationId; /* 终点Road ID */
    Map map; /* 地图数据 */
} PathFinderInput;

/* @brief 路径规划输出 */
typedef struct {
    RoadId pathNodes[MAX_PATH_NODES]; /* 路径节点数组 */
    int pathSize; /* 路径节点数量 */
} PathFinderOutput;

/**
  * @brief 拓扑路径搜索
  * @param[in]  param 参数
  * @param[in]  input 输入
  * @param[out] output 输出
  * @retval int 0成功 非0失败
  */
int findTopologyPath(PathFinderParam* param, PathFinderInput* input, PathFinderOutput* output);

#ifdef __cplusplus
}
#endif

#endif /* TOPO_PATH_FINDER_H */