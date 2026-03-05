/**
 * @file trajectorySearch.h
 * @brief 轨迹最近点搜索模块头文件
 */

#ifndef TRAJECTORY_SEARCH_H
#define TRAJECTORY_SEARCH_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief 状态结构体定义
 * @details 表示当前状态，包含坐标信息
 */
typedef struct {
    double x; ///< x轴坐标，单位：m
    double y; ///< y轴坐标，单位：m
} State;

/**
 * @brief 轨迹结构体定义
 * @details 表示轨迹数据，包含多个轨迹点的坐标信息
 */
typedef struct {
    State* data; ///< 轨迹点数组，类型：Array<State, N>
    int size;    ///< 轨迹点数量
} Traj;

/**
 * @brief 查找最近轨迹点
 * @en_name findClosestPointOnTraj
 * @cn_name 轨迹最近点搜索
 * @type API
 * @param state 当前状态
 * @param traj 轨迹数据
 * @param[out] index 最近轨迹点的索引
 * @param[out] distance 最近点的欧氏距离
 * @retval int 执行结果码，0表示成功，-1表示失败
 * @granularity Function
 * @tag_level1 轨迹规划
 * @tag_level2 路径搜索
 * @formula d = sqrt((x1-x2)^2 + (y1-y2)^2)
 * @version 1.0.0
 * @date 2023-10-27
 * @author AutoGen
 */
int findClosestPointOnTraj(State state, const Traj* traj, int* index, double* distance);

#ifdef __cplusplus
}
#endif

#endif // TRAJECTORY_SEARCH_H