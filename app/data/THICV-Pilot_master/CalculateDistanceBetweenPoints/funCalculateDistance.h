/**
 * @file funCalculateDistance.h
 * @brief 计算两点之间的欧几里得距离的函数声明
 * @en_name calculateDistanceBetweenPoints
 * @cn_name 计算两点距离
 * @type 复合函数
 * @param point1 第一个点的坐标数组
 * @param point2 第二个点的坐标数组
 * @param[out] distance 计算得到的距离
 * @var 无
 * @retval 0 表示计算成功，-1 表示输入参数无效
 * @granularity 原子函数
 * @tag_level1 计算两点距离
 * @tag_level2 欧几里得距离
 * @formula distance = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
 * @version 1.0
 * @date 2023-10-01
 * @author 张三
 */

#ifndef FUN_CALCULATE_DISTANCE_H
#define FUN_CALCULATE_DISTANCE_H

/**
 * @brief 计算两点之间的欧几里得距离
 * @param point1 第一个点的坐标数组，长度为3
 * @param point2 第二个点的坐标数组，长度为3
 * @param[out] distance 计算得到的距离
 * @return int 返回0表示成功，-1表示失败
 */
int calculateDistanceBetweenPoints(const double point1[3], const double point2[3], double *distance);

#endif // FUN_CALCULATE_DISTANCE_H