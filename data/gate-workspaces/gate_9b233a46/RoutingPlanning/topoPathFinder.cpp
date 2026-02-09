/**
  **************************************************************************************
  * @file    topoPathFinder.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径搜索模块实现
  **************************************************************************************
  */

#include "topoPathFinder.h"
#include <stdio.h>
#include <string.h>
#include <string>


/**
  * @brief 拓扑路径搜索
  */
int findTopologyPath(PathFinderParam* param, PathFinderInput* input, PathFinderOutput* output)
{
    int ret = 0;
    int i = 0;
    
    /* 检查输入指针有效性 */
    if ((NULL == input) || (NULL == output)) {
        ret = -1;
        return ret;
    }

    /* 初始化输出路径大小 */
    output->pathSize = 0;

    /* 模拟路径搜索算法 */
    /* 在此简单示例中，如果起点和终点存在于地图中，则返回一条直接连接的路径 */
    /* 实际应实现Dijkstra或A*算法 */
    
    int originFound = 0;
    int destinationFound = 0;
    
    for (i = 0; i < input->map.roadCount; i++) {
        if (input->map.roads[i].id == input->originId) {
            originFound = 1;
        }
        if (input->map.roads[i].id == input->destinationId) {
            destinationFound = 1;
        }
    }

    if ((0 == originFound) || (0 == destinationFound)) {
        printf("Error: Origin or Destination not found in map.\n");
        ret = -2;
        return ret;
    }

    /* 构造路径：起点 -> 终点 */
    if (output->pathSize < MAX_PATH_NODES) {
        output->pathNodes[output->pathSize] = input->originId;
        output->pathSize = output->pathSize + 1;
    }
    
    if (output->pathSize < MAX_PATH_NODES) {
        output->pathNodes[output->pathSize] = input->destinationId;
        output->pathSize = output->pathSize + 1;
    }

    return 0;
}