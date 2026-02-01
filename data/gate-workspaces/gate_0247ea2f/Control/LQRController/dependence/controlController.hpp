/**
 * @file controlController.hpp
 * @brief 智能驾驶控制模块相关依赖定义
 * @details 包含控制算法中常用的基础数学运算与数据结构定义
 */

#ifndef CONTROL_CONTROLLER_HPP
#define CONTROL_CONTROLLER_HPP

#include <cmath>

/**
 * @brief 两点欧几里得距离计算
 * @details 计算二维平面上两点之间的直线距离
 * @en_name get2Dis
 * @cn_name 两点距离计算
 * @type 函数
 * @param x1 第一个点的X坐标 [m]
 * @param x2 第二个点的X坐标 [m]
 * @param y1 第一个点的Y坐标 [m]
 * @param y2 第二个点的Y坐标 [m]
 * @retval double 两点间的欧几里得距离 [m]
 * @granularity 原子函数
 * @tag_level1 基础数学
 * @tag_level2 距离计算
 * @formula \sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static inline double get2Dis(double x1, double x2, double y1, double y2)
{
    double deltaX = x1 - x2;
    double deltaY = y1 - y2;
    double distSq = deltaX * deltaX + deltaY * deltaY;
    double distance = sqrt(distSq);
    return distance;
}

/**
 * @brief 点位几何信息结构体
 * @details 用于存储两点间的距离及中心点坐标
 * @en_name PointGeometryInfo
 * @cn_name 点位几何信息
 * @type 结构体
 * @field double Distance 两点间欧几里得距离 [m]
 * @field double CenterX 中心点X坐标 [m]
 * @field double CenterY 中心点Y坐标 [m]
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
typedef struct {
    double Distance; /* 两点间欧几里得距离 [m] */
    double CenterX;  /* 中心点X坐标 [m] */
    double CenterY;  /* 中心点Y坐标 [m] */
} PointGeometryInfo;

/**
 * @brief 计算两点距离与中心点
 * @details 接收两点坐标，计算距离并返回包含中心点坐标的结构体，含有效性检查
 * @en_name calcDisAndCenter
 * @cn_name 计算距离与中心点
 * @type 函数
 * @param x1 第一个点的X坐标 [m]
 * @param x2 第二个点的X坐标 [m]
 * @param y1 第一个点的Y坐标 [m]
 * @param y2 第二个点的Y坐标 [m]
 * @param pResult 结果结构体指针 [OUT]
 * @retval int 执行状态，0-成功，-1-输入无效
 * @granularity 复合函数
 * @tag_level1 基础数学
 * @tag_level2 几何计算
 * @formula D=\sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}, X_c=(x_1+x_2)/2, Y_c=(y_1+y_2)/2
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int calcDisAndCenter(double x1, double x2, double y1, double y2, PointGeometryInfo* pResult);

#endif // CONTROL_CONTROLLER_HPP