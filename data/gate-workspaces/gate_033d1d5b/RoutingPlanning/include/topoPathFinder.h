/**
  **************************************************************************************
  * @file    topoPathFinder.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径规划模块头文件
  **************************************************************************************
  */

#ifndef TOPO_PATH_FINDER_H
#define TOPO_PATH_FINDER_H

#include "../../Common/dataType.h"

#define MAX_PATH_NODES 64 /* 最大路径节点数 */

/* 路径规划输入参数结构体 */
typedef struct {
    int originId;        /* 起点ID */
    int destinationId;   /* 终点ID */
    Map map;             /* 地图数据 */
} PathFinderInput;

/* 路径规划输出参数结构体 */
typedef struct {
    int pathNodes[MAX_PATH_NODES]; /* 路径节点ID数组 */
    int pathSize;                  /* 路径节点数量 */
} PathFinderOutput;

/* 路径规划配置参数结构体 */
typedef struct {
    int dummy; /* 预留参数 */
} PathFinderParam;

/**
  * @brief 查找拓扑路径
  * @cn_name 查找拓扑路径
  * @en_name findTopologyPath
  * @type 函数
  * @param[in] para 配置参数
  * @param[in] input 输入数据
  * @param[out] output 输出数据
  * @retval int 0-成功, 其他-失败
  */
int findTopologyPath(PathFinderParam* para, PathFinderInput* input, PathFinderOutput* output);

#endif /* TOPO_PATH_FINDER_H */