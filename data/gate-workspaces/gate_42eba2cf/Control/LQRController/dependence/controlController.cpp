/**
 * @file controlController.cpp
 * @brief 智能驾驶控制模块通用功能实现
 * @details 实现calcGeometryInfo函数，封装几何计算逻辑
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGen
 */

#include "Control/LQRController/dependence/controlController.hpp"
#include <string.h>

/**
 * @brief 填充无效结果
 * @details 当输入无效时，将结果结构体置为无效状态
 * @param[out] result 结果结构体指针
 * @tag_level2 辅助函数
 * @date 2023-10-27
 * @author SystemGen
 */
static void fillInvalidResult(GeometryResult* result) {
    result->Distance = 0.0;
    result->CenterX = 0.0;
    result->CenterY = 0.0;
    result->IsValid = 0;
}

/**
 * @brief 填充有效结果
 * @details 将计算出的距离和中心点坐标填入结果结构体
 * @param[in] dist 计算得到的距离
 * @param[in] cx 计算得到的中心点X坐标
 * @param[in] cy 计算得到的中心点Y坐标
 * @param[out] result 结果结构体指针
 * @tag_level2 辅助函数
 * @date 2023-10-27
 * @author SystemGen
 */
static void fillValidResult(double dist, double cx, double cy, GeometryResult* result) {
    result->Distance = dist;
    result->CenterX = cx;
    result->CenterY = cy;
    result->IsValid = 1;
}

/**
 * @brief 计算两点距离与中心点（实现）
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
GeometryResult calcGeometryInfo(double x1, double y1, double x2, double y2) {
    GeometryResult result;
    int v1 = checkDoubleValid(x1);
    int v2 = checkDoubleValid(y1);
    int v3 = checkDoubleValid(x2);
    int v4 = checkDoubleValid(y2);
    int allValid = 0;
    
    /* 逻辑与：所有输入均有效时 allValid 为 1 */
    if (1 == v1) {
        if (1 == v2) {
            if (1 == v3) {
                if (1 == v4) {
                    allValid = 1;
                }
            }
        }
    }

    if (1 == allValid) {
        double dist = get2Dis(x1, y1, x2, y2);
        double cx = 0.0;
        double cy = 0.0;
        calcCenterPoint(x1, y1, x2, y2, &cx, &cy);
        fillValidResult(dist, cx, cy, &result);
    } else {
        fillInvalidResult(&result);
    }

    return result;
}