/**
 * @file funCalculateDistance.cpp
 * @brief 计算两点之间的欧几里得距离
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

#include <cmath>
#include "funCalculateDistance.h"

/**
 * @brief 计算两点之间的欧几里得距离
 * @param point1 第一个点的坐标数组，长度为3
 * @param point2 第二个点的坐标数组，长度为3
 * @param[out] distance 计算得到的距离
 * @return int 返回0表示成功，-1表示失败
 */
int calculateDistanceBetweenPoints(const double point1[3], const double point2[3], double *distance) {
    int result = 0;
    double deltaX = 0.0; // x方向的差值
    double deltaY = 0.0; // y方向的差值
    double deltaZ = 0.0; // z方向的差值
    double squaredSum = 0.0; // 差值的平方和

    if ((point1 == NULL) || (point2 == NULL) || (distance == NULL)) {
        result = -1;
    } else {
        deltaX = point2[0] - point1[0]; // 计算x方向差值
        deltaY = point2[1] - point1[1]; // 计算y方向差值
        deltaZ = point2[2] - point1[2]; // 计算z方向差值

        squaredSum = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ; // 计算平方和

        *distance = sqrt(squaredSum); // 计算距离
    }

    return result;
}

/**
 * @brief 主函数，用于测试 calculateDistanceBetweenPoints
 * @return int 返回0表示程序正常结束
 */
int main() {
    double pointA[3] = {1.0, 2.0, 3.0}; // 第一个点的坐标
    double pointB[3] = {4.0, 6.0, 8.0}; // 第二个点的坐标
    double distance = 0.0; // 存储计算结果的距离

    int status = 0; // 函数返回状态

    status = calculateDistanceBetweenPoints(pointA, pointB, &distance);

    if (status == 0) {
        // 打印计算结果
        printf("The distance between points is: %f\n", distance);
    } else {
        // 打印错误信息
        printf("Error: Invalid input parameters.\n");
    }

    return 0;
}