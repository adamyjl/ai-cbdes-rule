/**
 * @file testControlController.cpp
 * @brief 智能驾驶控制模块单元测试
 * @details 验证几何计算功能的正确性与鲁棒性
 * @version 1.0
 * @date 2023-10-27
 * @author SystemGen
 */

#include "Control/LQRController/dependence/controlController.hpp"
#include <stdio.h>
#include <float.h>

/**
 * @brief 打印测试结果
 * @details 格式化输出测试用例的输入与输出
 * @param[in] caseName 测试用例名称
 * @param[in] x1 输入X1
 * @param[in] y1 输入Y1
 * @param[in] x2 输入X2
 * @param[in] y2 输入Y2
 * @param[in] result 计算结果结构体
 * @tag_level2 辅助函数
 * @date 2023-10-27
 * @author SystemGen
 */
static void printResult(const char* caseName, double x1, double y1, double x2, double y2, GeometryResult result) {
    printf("[测试用例] %s\n", caseName);
    printf("  输入: (%.2f, %.2f), (%.2f, %.2f)\n", x1, y1, x2, y2);
    if (1 == result.IsValid) {
        printf("  输出: 有效, 距离=%.4f, 中心=(%.4f, %.4f)\n\n", result.Distance, result.CenterX, result.CenterY);
    } else {
        printf("  输出: 无效\n\n");
    }
}

/**
 * @brief 主测试入口
 * @details 执行各类测试用例
 * @param[in] argc 参数个数
 * @param[in] argv 参数列表
 * @return int 执行状态码
 * @tag_level1 复合函数
 * @date 2023-10-27
 * @author SystemGen
 */
int main(int argc, char* argv[]) {
    /* 1. 正常输入测试 */
    GeometryResult r1 = calcGeometryInfo(0.0, 0.0, 3.0, 4.0);
    printResult("正常输入(0,0)->(3,4)", 0.0, 0.0, 3.0, 4.0, r1);

    /* 2. 负坐标测试 */
    GeometryResult r2 = calcGeometryInfo(-1.0, -1.0, 1.0, 1.0);
    printResult("负坐标(-1,-1)->(1,1)", -1.0, -1.0, 1.0, 1.0, r2);

    /* 3. 相同点测试 */
    GeometryResult r3 = calcGeometryInfo(5.0, 5.0, 5.0, 5.0);
    printResult("相同点(5,5)->(5,5)", 5.0, 5.0, 5.0, 5.0, r3);

    /* 4. 边界值测试 */
    GeometryResult r4 = calcGeometryInfo(DBL_MIN, DBL_MIN, DBL_MIN, DBL_MIN);
    printResult("边界最小值", DBL_MIN, DBL_MIN, DBL_MIN, DBL_MIN, r4);

    /* 5. 无效输入测试 */
    GeometryResult r5 = calcGeometryInfo(0.0, 0.0, NAN, 0.0);
    printResult("无效输入(NaN)", 0.0, 0.0, NAN, 0.0, r5);

    /* 6. 无穷大测试 */
    GeometryResult r6 = calcGeometryInfo(0.0, 0.0, INFINITY, 0.0);
    printResult("无效输入(Inf)", 0.0, 0.0, INFINITY, 0.0, r6);

    return 0;
}