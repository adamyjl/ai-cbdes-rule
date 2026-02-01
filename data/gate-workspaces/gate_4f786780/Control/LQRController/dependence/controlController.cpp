/**
 * @file controlController.cpp
 * @brief 智能驾驶控制模块功能实现
 * @details 实现点位几何信息计算的具体逻辑
 */

#include "controlController.hpp"
#include <cmath>
#include <limits>

/**
 * @brief 检查浮点数有效性
 * @en_name checkDoubleValid
 * @cn_name 检查浮点数有效性
 * @type 函数
 * @param val 待检查的数值
 * @retval int 1-有效，0-无效
 * @granularity 原子函数
 * @tag_level1 基础工具
 * @tag_level2 数据校验
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static int checkDoubleValid(double val)
{
    int isValid = 0;
    /* 使用标准库函数检查 NaN 和 Inf */
    int isNotNan = std::isfinite(val);
    
    if (isNotNan == 1) {
        isValid = 1;
    }
    
    return isValid;
}

/**
 * @brief 计算中心点坐标
 * @en_name calcCenterPoint
 * @cn_name 计算中心点坐标
 * @type 函数
 * @param x1 第一个点的X坐标 [m]
 * @param x2 第二个点的X坐标 [m]
 * @param y1 第一个点的Y坐标 [m]
 * @param y2 第二个点的Y坐标 [m]
 * @param pXc 中心点X坐标指针 [OUT]
 * @param pYc 中心点Y坐标指针 [OUT]
 * @retval void
 * @granularity 原子函数
 * @tag_level1 基础数学
 * @tag_level2 坐标计算
 * @formula X_c=(x_1+x_2)/2, Y_c=(y_1+y_2)/2
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static void calcCenterPoint(double x1, double x2, double y1, double y2, double* pXc, double* pYc)
{
    double sumX = x1 + x2;
    double sumY = y1 + y2;
    double centerX = sumX / 2.0;
    double centerY = sumY / 2.0;
    
    *pXc = centerX;
    *pYc = centerY;
}

/**
 * @brief 计算两点距离与中心点（入口函数）
 * @details 调用底层函数完成距离计算与中心点计算，并进行输入校验
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
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int calcDisAndCenter(double x1, double x2, double y1, double y2, PointGeometryInfo* pResult)
{
    int ret = -1;
    int validX1 = checkDoubleValid(x1);
    int validX2 = checkDoubleValid(x2);
    int validY1 = checkDoubleValid(y1);
    int validY2 = checkDoubleValid(y2);
    
    /* 只有所有输入均有效时才进行计算 */
    if ((validX1 == 1) && (validX2 == 1) && (validY1 == 1) && (validY2 == 1)) {
        /* 1. 调用现有函数计算距离 */
        double distance = get2Dis(x1, x2, y1, y2);
        
        /* 2. 计算中心点坐标 */
        double centerX = 0.0;
        double centerY = 0.0;
        calcCenterPoint(x1, x2, y1, y2, &centerX, &centerY);
        
        /* 3. 填充结果结构体 */
        pResult->Distance = distance;
        pResult->CenterX = centerX;
        pResult->CenterY = centerY;
        
        ret = 0;
    } else {
        /* 输入无效时，返回无效值（保持静默失败或记录日志） */
        ret = -1;
    }
    
    return ret;
}