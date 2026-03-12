/**
 * @file trajDerivabilityCheck.h
 * @brief 轨迹可导性检测模块头文件
 * @details 定义轨迹可导性检测所需的数据结构与函数接口
 * @version 1.0
 * @date 2023-10-27
 * @author Assistant
 */

#ifndef TRAJ_DERIVABILITY_CHECK_H
#define TRAJ_DERIVABILITY_CHECK_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>

/* 常量定义 */
#define MAX_POINTS_NUM 1000
#define MAX_OBJECT_NUM 50
#define PI 3.14159265358979323846

/* 基础数学结构体 */
typedef struct {
    double x; /* 坐标X，单位：m */
    double y; /* 坐标Y，单位：m */
} Point2D;

/* 规划点结构体 */
typedef struct {
    double x; /* 坐标X，单位：m */
    double y; /* 坐标Y，单位：m */
    double z; /* 坐标Z，单位：m */
    double theta; /* 航向角，单位：rad */
    double kappa; /* 曲率，单位：1/m */
    double v; /* 速度，单位：m/s */
    double a; /* 加速度，单位：m/s^2 */
    double relativeTime; /* 相对时间，单位：s */
} PlanningPoint;

/* 轨迹结构体 */
typedef struct {
    PlanningPoint points[MAX_POINTS_NUM]; /* 规划点数组，Array<PlanningPoint, MAX_POINTS_NUM> */
    int pointCount; /* 规划点数量 */
} PlanningTrajectory;

/* 预测障碍物结构体 */
typedef struct {
    Point2D position; /* 障碍物位置，单位：m */
    double width; /* 障碍物宽度，单位：m */
    double length; /* 障碍物长度，单位：m */
} Obstacle;

/* 预测结果结构体 */
typedef struct {
    Obstacle obstacles[MAX_OBJECT_NUM]; /* 障碍物数组，Array<Obstacle, MAX_OBJECT_NUM> */
    int obstacleCount; /* 障碍物数量 */
} PredictionResult;

/* 输入参数结构体 */
typedef struct {
    PlanningTrajectory trajectory; /* 待检测轨迹 */
    PredictionResult prediction; /* 预测结果 */
    double maxAccel; /* 最大纵向加速度，单位：m/s^2 */
    double maxDecel; /* 最大纵向减速度，单位：m/s^2 */
    double timeStep; /* 采样的时间步长，单位：s */
} TrajCheckInput;

/* 输出结果结构体 */
typedef struct {
    int isDerivable; /* 可导性标志：1-可导，0-不可导 */
    int errorIndex; /* 第一个不可导点的索引 */
    double errorValue; /* 错误值（如超出限度的加速度），单位：m/s^2 */
    double stopS; /* 停车距离，单位：m */
} TrajCheckOutput;

/**
 * @brief 检测轨迹的可导性
 * @en_name checkTrajectoryDerivability
 * @cn_name 轨迹可导性检测
 * @type 函数
 * @param[in] input 输入参数结构体指针
 * @param[out] output 输出结果结构体指针
 * @retval int 执行结果：0-成功，-1-失败
 * @granularity 模块级
 * @tag_level1 规划控制
 * @tag_level2 安全检查
 * @version 1.0
 * @date 2023-10-27
 * @author Assistant
 */
int checkTrajectoryDerivability(const TrajCheckInput *input, TrajCheckOutput *output);

#ifdef __cplusplus
}
#endif

#endif // TRAJ_DERIVABILITY_CHECK_H