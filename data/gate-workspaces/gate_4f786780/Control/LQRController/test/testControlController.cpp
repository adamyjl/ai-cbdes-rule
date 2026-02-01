/**
 * @file testControlController.cpp
 * @brief 智能驾驶控制模块单元测试
 * @details 对几何计算功能进行全覆盖测试
 */

#include "../dependence/controlController.hpp"
#include <iostream>
#include <cmath>

/**
 * @brief 比较两个双精度浮点数是否近似相等
 * @en_name assertDoubleEqual
 * @cn_name 断言双精度相等
 * @type 函数
 * @param expected 期望值
 * @param actual 实际值
 * @param tolerance 容差
 * @retval int 1-通过，0-失败
 * @granularity 原子函数
 * @tag_level1 测试工具
 * @tag_level2 断言
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static int assertDoubleEqual(double expected, double actual, double tolerance)
{
    double diff = expected - actual;
    /* 获取绝对值 */
    double absDiff = diff;
    if (diff < 0.0) {
        absDiff = -diff;
    }
    
    int result = 0;
    if (absDiff <= tolerance) {
        result = 1;
    }
    
    return result;
}

/**
 * @brief 打印测试结果
 * @en_name printTestResult
 * @cn_name 打印测试结果
 * @type 函数
 * @param caseName 测试用例名称
 * @param passed 是否通过
 * @retval void
 * @granularity 原子函数
 * @tag_level1 测试工具
 * @tag_level2 输出
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static void printTestResult(const char* caseName, int passed)
{
    if (passed == 1) {
        std::cout << "[PASS] " << caseName << std::endl;
    } else {
        std::cout << "[FAIL] " << caseName << std::endl;
    }
}

/**
 * @brief 测试正常输入情况
 * @en_name testNormalInput
 * @cn_name 测试正常输入
 * @type 函数
 * @retval void
 * @granularity 复合函数
 * @tag_level1 单元测试
 * @tag_level2 功能测试
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static void testNormalInput()
{
    double x1 = 0.0;
    double y1 = 0.0;
    double x2 = 3.0;
    double y2 = 4.0;
    
    PointGeometryInfo result;
    int status = calcDisAndCenter(x1, x2, y1, y2, &result);
    
    int pass = 0;
    if (status == 0) {
        int distCheck = assertDoubleEqual(5.0, result.Distance, 0.0001);
        int xcCheck = assertDoubleEqual(1.5, result.CenterX, 0.0001);
        int ycCheck = assertDoubleEqual(2.0, result.CenterY, 0.0001);
        
        if ((distCheck == 1) && (xcCheck == 1) && (ycCheck == 1)) {
            pass = 1;
        }
    }
    
    printTestResult("Test Normal Input (3-4-5 Triangle)", pass);
}

/**
 * @brief 测试无效输入
 * @en_name testInvalidInput
 * @cn_name 测试无效输入
 * @type 函数
 * @retval void
 * @granularity 复合函数
 * @tag_level1 单元测试
 * @tag_level2 边界测试
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static void testInvalidInput()
{
    double x1 = NAN;
    double y1 = 0.0;
    double x2 = 3.0;
    double y2 = 4.0;
    
    PointGeometryInfo result;
    int status = calcDisAndCenter(x1, x2, y1, y2, &result);
    
    int pass = 0;
    if (status == -1) {
        pass = 1;
    }
    
    printTestResult("Test Invalid Input (NaN)", pass);
}

/**
 * @brief 测试无穷大输入
 * @en_name testInfInput
 * @cn_name 测试无穷大输入
 * @type 函数
 * @retval void
 * @granularity 复合函数
 * @tag_level1 单元测试
 * @tag_level2 边界测试
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
static void testInfInput()
{
    double x1 = INFINITY;
    double y1 = 0.0;
    double x2 = 3.0;
    double y2 = 4.0;
    
    PointGeometryInfo result;
    int status = calcDisAndCenter(x1, x2, y1, y2, &result);
    
    int pass = 0;
    if (status == -1) {
        pass = 1;
    }
    
    printTestResult("Test Invalid Input (Inf)", pass);
}

/**
 * @brief 主函数
 * @details 程序入口，执行所有测试用例
 * @en_name main
 * @cn_name 主函数
 * @type 函数
 * @retval int 程序退出码
 * @granularity 复合函数
 * @tag_level1 程序入口
 * @tag_level2 测试主控
 * @version 1.0
 * @date 2023-10-27
 * @author System
 */
int main()
{
    std::cout << "--- Start Unit Test for Control Controller ---" << std::endl;
    
    testNormalInput();
    testInvalidInput();
    testInfInput();
    
    std::cout << "--- End Unit Test ---" << std::endl;
    return 0;
}