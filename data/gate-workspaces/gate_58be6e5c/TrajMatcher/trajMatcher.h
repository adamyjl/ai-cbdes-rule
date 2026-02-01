/**
 * @file trajMatcher.h
 * @brief 轨迹匹配模块头文件
 * @details 提供基于状态与轨迹查找最近点的接口
 */

#ifndef TRAJ_MATCHER_H
#define TRAJ_MATCHER_H

#ifdef __cplusplus
extern "C" {
#endif

/* 结构体定义 */

/**
 * @brief 状态结构体
 * @details 描述车辆或物体的二维位置状态
 */
typedef struct {
    double x; /**< X坐标，单位：m */
    double y; /**< Y坐标，单位：m */
} State;

/**
 * @brief 轨迹点结构体
 * @details 描述单个轨迹点的信息
 */
typedef struct {
    double x;      /**< X坐标，单位：m */
    double y;      /**< Y坐标，单位：m */
    double t;      /**< 时间戳，单位：s */
    double v;      /**< 速度，单位：m/s */
    double kappa;  /**< 曲率，单位：1/m */
    double a;      /**< 加速度，单位：m/s^2 */
    double yaw;    /**< 航向角，单位：rad */
} TrajPoint;

/**
 * @brief 轨迹结构体
 * @details 描述由多个轨迹点组成的轨迹集合
 * @var Array<TrajPoint, N> 轨迹点数组指针
 * @var count 轨迹点数量
 */
typedef struct {
    TrajPoint* points; /**< 轨迹点数组指针，Array<TrajPoint, N> */
    int count;         /**< 轨迹点数量 */
} Traj;

/**
 * @brief 匹配结果结构体
 * @details 包含最近点的索引和欧氏距离
 */
typedef struct {
    int index;    /**< 最近轨迹点索引 */
    double distance; /**< 欧氏距离，单位：m */
} MatchResult;

/* 函数声明 */

/**
 * @brief 查找最近轨迹点
 * @details 计算给定状态与轨迹中各点的欧氏距离，找出最小距离对应的索引
 * 
 * @param state [IN] 输入状态
 * @param traj [IN] 输入轨迹
 * @retval MatchResult 匹配结果
 * @tag_level1 Algorithm
 * @version 1.0.0
 * @date 2023-10-27
 * @author System
 */
MatchResult findNearestTrajPoint(State state, const Traj traj);

#ifdef __cplusplus
}
#endif

#endif // TRAJ_MATCHER_H