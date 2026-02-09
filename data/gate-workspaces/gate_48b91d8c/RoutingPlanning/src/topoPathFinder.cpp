/**
  ******************************************************************************
  * @file    topoPathFinder.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径规划模块实现 (Dijkstra算法)
  ******************************************************************************
  */

#include "../include/topoPathFinder.h"
#include <stdio.h>
#include <string.h>
#include <string>


#define MAX_INT 999999

/**
  * @brief 查找拓扑路径 (Dijkstra算法)
  */
int findTopologyPath(PathFinderParam *para, PathFinderInput *input, PathFinderOutput *output)
{
    int ret = 0;
    int dist[MAX_ROADS];       ///< 距离数组
    int prev[MAX_ROADS];       ///< 前驱节点数组
    int visited[MAX_ROADS];    ///< 访问标记数组
    int i = 0;
    int j = 0;
    int u = 0;
    int minDist = 0;
    int current = 0;
    int pathIdx = 0;

    /* 初始化 */
    for (i = 0; i < MAX_ROADS; i = i + 1) {
        dist[i] = MAX_INT;
        prev[i] = -1;
        visited[i] = 0;
    }
    
    /* 寻找起点索引 */
    int startIdx = -1;
    int endIdx = -1;
    for (i = 0; i < input->map.roadCount; i = i + 1) {
        if (input->map.roads[i].id == input->originId) {
            startIdx = i;
        }
        if (input->map.roads[i].id == input->destinationId) {
            endIdx = i;
        }
    }

    if (startIdx < 0 || endIdx < 0) {
        printf("Error: Invalid origin or destination ID.\n");
        return -1;
    }

    dist[startIdx] = 0;

    /* Dijkstra 主循环 */
    for (i = 0; i < input->map.roadCount; i = i + 1) {
        minDist = MAX_INT;
        u = -1;
        
        /* 寻找最小距离节点 */
        for (j = 0; j < input->map.roadCount; j = j + 1) {
            if (visited[j] == 0) {
                if (dist[j] < minDist) {
                    minDist = dist[j];
                    u = j;
                }
            }
        }

        if (u == -1 || u == endIdx) {
            break; /* 找不到可达节点或已到达终点 */
        }

        visited[u] = 1;

        /* 更新邻居节点距离 */
        for (j = 0; j < input->map.roads[u].toCount; j = j + 1) {
            int nextRoadId = input->map.roads[u].to[j];
            int v = -1;
            int k = 0;
            /* 查找邻居在数组中的索引 */
            for (k = 0; k < input->map.roadCount; k = k + 1) {
                if (input->map.roads[k].id == nextRoadId) {
                    v = k;
                    break;
                }
            }
            
            if (v >= 0) {
                if (visited[v] == 0) {
                    int alt = dist[u] + (int)(input->map.roads[v].length);
                    if (alt < dist[v]) {
                        dist[v] = alt;
                        prev[v] = u;
                    }
                }
            }
        }
    }

    /* 回溯路径 */
    pathIdx = 0;
    current = endIdx;
    while (current != -1) {
        output->pathNodes[pathIdx] = input->map.roads[current].id;
        pathIdx = pathIdx + 1;
        current = prev[current];
    }
    
    /* 路径反转 (因为回溯是倒序的) */
    int temp = 0;
    int left = 0;
    int right = pathIdx - 1;
    while (left < right) {
        temp = output->pathNodes[left];
        output->pathNodes[left] = output->pathNodes[right];
        output->pathNodes[right] = temp;
        left = left + 1;
        right = right - 1;
    }
    output->pathSize = pathIdx;

    (void)para; /* 避免未使用参数警告 */

    return ret;
}