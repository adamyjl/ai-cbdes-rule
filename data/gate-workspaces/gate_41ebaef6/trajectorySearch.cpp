/**
 * @file trajectorySearch.cpp
 * @brief 轨迹最近点搜索模块实现文件
 * @details 实现基于欧氏距离的最近轨迹点搜索功能
 */

#include "trajectorySearch.h"
#include <cmath>
#include <stdexcept>

/**
 * @brief 计算两点间欧氏距离
 * @en_name calcEuclideanDistance
 * @cn_name 欧氏距离计算
 * @type Helper
 * @param p1 第一个点
 * @param p2 第二个点
 * @retval double 欧氏距离
 * @granularity Atomic
 * @formula dist = sqrt((x1-x2)^2 + (y1-y2)^2)
 * @version 1.0.0
 * @date 2023-10-27
 * @author AutoGen
 */
static double calcEuclideanDistance(State p1, State p2) {
    double dx = p1.x - p2.x; // x方向差值
    double dy = p1.y - p2.y; // y方向差值
    double dx_sq = dx * dx;  // x方向差值平方
    double dy_sq = dy * dy;  // y方向差值平方
    double sum_sq = dx_sq + dy_sq; // 平方和
    double dist = sqrt(sum_sq); // 开方得到距离
    return dist;
}

/**
 * @brief 遍历轨迹查找最近点
 * @en_name searchClosestPoint
 * @cn_name 遍历搜索最近点
 * @type Helper
 * @param state 当前状态
 * @param traj 轨迹数据
 * @param[out] index 最近点索引
 * @param[out] minDist 最小距离
 * @retval int 执行结果码
 * @granularity Atomic
 * @version 1.0.0
 * @date 2023-10-27
 * @author AutoGen
 */
static int searchClosestPoint(State state, const Traj* traj, int* index, double* minDist) {
    int i = 0; // 循环变量
    int curr_size = traj->size; // 当前轨迹大小
    int best_idx = 0; // 当前最佳索引
    double curr_dist = 0.0; // 当前计算距离
    double best_dist = 0.0; // 当前最佳距离
    State curr_point; // 当前遍历点
    
    // 初始化最佳距离为第一个点的距离
    curr_point = traj->data[0];
    best_dist = calcEuclideanDistance(state, curr_point);
    best_idx = 0;
    
    i = 1;
    // 遍历剩余点
    while (i < curr_size) {
        curr_point = traj->data[i];
        curr_dist = calcEuclideanDistance(state, curr_point);
        
        // 比较距离并更新最优解
        if (curr_dist < best_dist) {
            best_dist = curr_dist;
            best_idx = i;
        }
        
        i = i + 1;
    }
    
    *index = best_idx;
    *minDist = best_dist;
    
    return 0;
}

/**
 * @brief 查找最近轨迹点（接口实现）
 * @en_name findClosestPointOnTraj
 * @cn_name 轨迹最近点搜索
 * @type API
 * @param state 当前状态
 * @param traj 轨迹数据
 * @param[out] index 最近轨迹点的索引
 * @param[out] distance 最近点的欧氏距离
 * @retval int 执行结果码，0表示成功，-1表示失败
 * @granularity Composite
 * @version 1.0.0
 * @date 2023-10-27
 * @author AutoGen
 */
int findClosestPointOnTraj(State state, const Traj* traj, int* index, double* distance) {
    int ret = 0; // 返回值
    int is_empty = 0; // 是否为空标志
    
    // 检查轨迹是否为空
    is_empty = (traj == 0) || (traj->data == 0) || (traj->size <= 0);
    if (is_empty != 0) {
        // 抛出异常或返回错误码，此处按规范返回错误码
        return -1;
    }
    
    // 执行搜索
    ret = searchClosestPoint(state, traj, index, distance);
    
    return ret;
}