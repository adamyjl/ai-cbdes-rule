/**
  **************************************************************************************
  * @file    topoPathFinder.cpp
  * @author  System Generator
  * @date    2023-10-27
  * @brief   拓扑路径规划模块实现
  **************************************************************************************
  */

#include "../include/topoPathFinder.h"
#include <stdio.h>
#include <string.h>
#include <string>


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
int findTopologyPath(PathFinderParam* para, PathFinderInput* input, PathFinderOutput* output)
{
    int i = 0;
    int isFound = 0;
    
    /* 检查输入指针有效性 */
    if (NULL == input || NULL == output) {
        return -1;
    }
    
    /* 简单模拟路径查找逻辑：假设顺序连接 */
    if (input->map.roadCount > 0) {
        for (i = 0; i < input->map.roadCount; i = i + 1) {
            if (input->map.roads[i].id == input->originId) {
                output->pathNodes[0] = input->originId;
                isFound = 1;
            }
        }
        
        if (1 == isFound) {
            for (i = 0; i < input->map.roadCount; i = i + 1) {
                if (input->map.roads[i].id == input->destinationId) {
                    output->pathNodes[1] = input->destinationId;
                    output->pathSize = 2;
                    return 0;
                }
            }
        }
    }
    
    /* 未找到路径 */
    output->pathSize = 0;
    return -2;
}