/**
 * @file funTriangle.h
 * @brief 三角形计算模块头文件
 * @details 提供基于底高、三边长度、坐标点的三角形面积计算功能
 */

#ifndef COMMON_FUNTRIANGLE_H_
#define COMMON_FUNTRIANGLE_H_

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief 计算三角形面积
 * @en_name calculateTriangleArea
 * @cn_name 计算三角形面积
 * @type Function
 * @param mode[IN] 计算模式：0-底和高，1-三边长度，2-坐标点
 * @param params[IN] 输入参数数组，根据模式不同含义不同
 * @retval double 返回计算得到的面积，如果输入无效则返回 NaN
 * @granularity 二级函数
 * @tag_level1 几何计算
 * @tag_level2 面积计算
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
double calculateTriangleArea(int mode, const double params[]);

#ifdef __cplusplus
}
#endif

#endif // COMMON_FUNTRIANGLE_H_