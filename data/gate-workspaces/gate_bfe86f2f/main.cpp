/**
 * @file main.cpp
 * @brief 测试入口文件
 * @details 验证三角形面积计算功能
 */

#include <iostream>
#include <iomanip>
#include "common/funTriangle.h"

/**
 * @brief 辅助打印函数
 * @en_name printResult
 * @cn_name 打印结果
 * @type Function
 * @param mode[IN] 模式描述
 * @param result[IN] 计算结果
 * @granularity 二级函数
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
static void printResult(const char* mode, double result) {
    std::cout << std::fixed << std::setprecision(10);
    if (result != result) { /* 判断NaN */
        std::cout << "[" << mode << "] Result: NaN" << std::endl;
    } else {
        std::cout << "[" << mode << "] Result: " << result << std::endl;
    }
}

/**
 * @brief 主测试函数
 * @en_name main
 * @cn_name 主函数
 * @type Function
 * @retval int 执行状态码
 * @granularity 一级函数
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGenerator
 */
int main() {
    /* 测试数据初始化 */
    int mode1 = 0; /* 底和高 */
    double params1[] = {5.0, 4.0}; /* 面积应为 10.0 */

    int mode2 = 1; /* 三边 */
    double params2[] = {3.0, 4.0, 5.0}; /* 直角三角形，面积应为 6.0 */

    int mode3 = 2; /* 坐标 */
    double params3[] = {0.0, 0.0, 4.0, 0.0, 4.0, 3.0}; /* 面积应为 6.0 */

    int mode4 = 1; /* 无效三边 */
    double params4[] = {1.0, 2.0, 10.0}; /* 无法构成三角形 */

    int mode5 = 2; /* 共线坐标 */
    double params5[] = {0.0, 0.0, 1.0, 1.0, 2.0, 2.0}; /* 三点共线 */

    /* 执行计算 */
    double res1 = calculateTriangleArea(mode1, params1);
    double res2 = calculateTriangleArea(mode2, params2);
    double res3 = calculateTriangleArea(mode3, params3);
    double res4 = calculateTriangleArea(mode4, params4);
    double res5 = calculateTriangleArea(mode5, params5);

    /* 输出结果 */
    printResult("BaseHeight", res1);
    printResult("ThreeSides", res2);
    printResult("Coordinates", res3);
    printResult("InvalidSides", res4);
    printResult("Collinear", res5);

    return 0;
}