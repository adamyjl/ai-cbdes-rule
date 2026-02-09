/**
  ******************************************************************************
  * @file    topoPathFinder.h
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径规划模块接口
  ******************************************************************************
  */

#ifndef TOPO_PATH_FINDER_H
#define TOPO_PATH_FINDER_H

#include "../../Common/dataType.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int dummy; ///< 占位参数
} PathFinderParam;

typedef struct {
    Map map;         ///< 地图数据
    int originId;    ///< 起点ID
    int destinationId; ///< 终点ID
} PathFinderInput;

typedef struct {
    int pathNodes[MAX_PATH_NODES]; ///< 路径节点列表
    int pathSize;                  ///< 路径长度
    PathInfo pathLanes;            ///< 详细路径信息
} PathFinderOutput;

/**
  * @brief 查找拓扑路径
  * @param[in]  para  输入参数
  * @param[in]  input 输入数据
  * @param[out] output 输出数据
  * @retval 0 成功, 非0 失败
  */
int findTopologyPath(PathFinderParam *para, PathFinderInput *input, PathFinderOutput *output);

#ifdef __cplusplus
}
#endif

#endif /* TOPO_PATH_FINDER_H */