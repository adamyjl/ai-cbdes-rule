/**
 * @file trajMatcher.cpp
 * @brief 轨迹匹配模块实现文件
 * @details 实现基于状态与轨迹查找最近点的逻辑，遵循严格的C语言编码规范
 */

#include "trajMatcher.h"
#include <cmath>
#include <limits>
#include <float.h>

/**
 * @brief 计算两点间欧氏距离的平方
 * @details 避免开方运算以提高性能，在比较大小等价
 * 
 * @param dx [IN] X方向差值
 * @param dy [IN] Y方向差值
 * @retval double 距离的平方
 * @tag_level2 Atomic
 * @version 1.0.0
 * @date 2023-10-27
 * @author System
 */
static double calcSquaredDist(double dx, double dy)
{
    double dist_sq = 0.0; /* 距离平方 */
    dist_sq = dx * dx;
    dist_sq = dist_sq + (dy * dy);
    return dist_sq;
}

/**
 * @brief 查找最近轨迹点（复合函数）
 * @details 遍历轨迹点，计算欧氏距离，返回最小距离对应的索引和距离
 * 
 * @param state [IN] 输入状态
 * @param traj [IN] 输入轨迹
 * @retval MatchResult 匹配结果
 * @tag_level1 Composite
 * @version 1.0.0
 * @date 2023-10-27
 * @author System
 */
MatchResult findNearestTrajPoint(State state, const Traj traj)
{
    MatchResult result; /* 返回结果 */
    int i = 0; /* 循环变量 */
    int traj_count = 0; /* 轨迹点总数 */
    TrajPoint current_point; /* 当前循环中的轨迹点 */
    double diff_x = 0.0; /* X坐标差值 */
    double diff_y = 0.0; /* Y坐标差值 */
    double current_dist_sq = 0.0; /* 当前点距离平方 */
    double min_dist_sq = 0.0; /* 最小距离平方 */
    int best_index = -1; /* 最近点索引 */
    double best_distance = 0.0; /* 最近点距离 */
    int is_empty = 0; /* 轨迹是否为空的标志 */
    
    /* 初始化返回值 */
    result.index = -1;
    result.distance = -1.0;
    
    /* 检查轨迹是否为空 */
    traj_count = traj.count;
    is_empty = (traj_count <= 0);
    
    if (is_empty) {
        result.index = -1;
        result.distance = 0.0;
        return result;
    }
    
    /* 初始化最小距离为极大值 */
    min_dist_sq = DBL_MAX;
    
    /* 遍历轨迹点 */
    for (i = 0; i < traj_count; i = i + 1) {
        /* 获取当前点 */
        current_point = traj.points[i];
        
        /* 计算坐标差值 */
        diff_x = current_point.x - state.x;
        diff_y = current_point.y - state.y;
        
        /* 计算距离平方 */
        current_dist_sq = calcSquaredDist(diff_x, diff_y);
        
        /* 比较并更新最小值 */
        if (current_dist_sq < min_dist_sq) {
            min_dist_sq = current_dist_sq;
            best_index = i;
        }
    }
    
    /* 计算最终欧氏距离 */
    best_distance = std::sqrt(min_dist_sq);
    
    /* 填充结果 */
    result.index = best_index;
    result.distance = best_distance;
    
    return result;
}