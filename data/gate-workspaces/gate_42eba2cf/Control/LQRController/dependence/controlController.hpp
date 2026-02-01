/**
 * @file controlController.hpp
 * @brief 智能驾驶控制模块通用定义与工具函数
 * @details 包含二维几何计算的结构体定义与原子函数实现
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGen
 */

#ifndef CONTROL_CONTROLLER_HPP
#define CONTROL_CONTROLLER_HPP

#ifdef __cplusplus
extern "C" {
#endif

#include <math.h>

/**
 * @brief 二维点坐标结构体
 * @details 存储二维平面上的点坐标
 */
typedef struct {
    double X; /* X坐标, 单位: m */
    double Y; /* Y坐标, 单位: m */
} Point2D;

/**
 * @brief 距离与中心点结果结构体
 * @details 存储两点间距离及中心点坐标
 */
typedef struct {
    double Distance; /* 欧几里得距离, 单位: m */
    double CenterX;  /* 中心点X坐标, 单位: m */
    double CenterY;  /* 中心点Y坐标, 单位: m */
    int IsValid;     /* 数据有效性标志: 1-有效, 0-无效 */
} GeometryResult;

/**
 * @brief 检查双精度浮点数有效性
 * @details 检查输入值是否为NaN或Inf
 * @param[in] val 待检查的数值
 * @return int 1-有效, 0-无效
 * @tag_level2 辅助函数
 * @date 2023-10-27
 * @author SystemGen
 */
static inline int checkDoubleValid(double val) {
    int isValid = 0;
    /* 判断是否为NaN或Inf */
    int isNan = (val != val);
    int isInf = (fabs(val) == INFINITY);
    
    if (0 == isNan) {
        if (0 == isInf) {
            isValid = 1;
        }
    }
    return isValid;
}

/**
 * @brief 计算二维平面上两点间的欧几里得距离
 * @details 基于勾股定理计算两点间直线距离
 * @param[in] x1 第一个点的X坐标
 * @param[in] y1 第一个点的Y坐标
 * @param[in] x2 第二个点的X坐标
 * @param[in] y2 第二个点的Y坐标
 * @return double 两点间的欧几里得距离
 * @formula $D = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}$
 * @tag_level2 原子函数
 * @date 2023-10-27
 * @author SystemGen
 */
static inline double get2Dis(double x1, double y1, double x2, double y2) {
    double deltaX = x1 - x2;
    double deltaY = y1 - y2;
    double dist = sqrt(deltaX * deltaX + deltaY * deltaY);
    return dist;
}

/**
 * @brief 计算两点中心点坐标
 * @details 计算两点连线的中点坐标
 * @param[in] x1 第一个点的X坐标
 * @param[in] y1 第一个点的Y坐标
 * @param[in] x2 第二个点的X坐标
 * @param[in] y2 第二个点的Y坐标
 * @param[out] centerX 中心点X坐标指针
 * @param[out] centerY 中心点Y坐标指针
 * @tag_level2 原子函数
 * @date 2023-10-27
 * @author SystemGen
 */
static inline void calcCenterPoint(double x1, double y1, double x2, double y2, double* centerX, double* centerY) {
    double sumX = x1 + x2;
    double sumY = y1 + y2;
    *centerX = sumX / 2.0;
    *centerY = sumY / 2.0;
}

/**
 * @brief 计算两点距离与中心点
 * @details 整合距离计算与中心点计算逻辑，包含输入有效性检查
 * @param[in] x1 第一个点的X坐标
 * @param[in] y1 第一个点的Y坐标
 * @param[in] x2 第二个点的X坐标
 * @param[in] y2 第二个点的Y坐标
 * @return GeometryResult 包含距离和中心点坐标的结构体
 * @tag_level1 复合函数
 * @date 2023-10-27
 * @author SystemGen
 */
GeometryResult calcGeometryInfo(double x1, double y1, double x2, double y2);

#ifdef __cplusplus
}
#endif

#endif // CONTROL_CONTROLLER_HPP