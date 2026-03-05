/**
 * @file testTrajUtils.cpp
 * @brief 轨迹工具单元测试文件
 * @details 验证最近点查找功能的正确性与异常处理能力
 * @date 2023-10-27
 * @author SystemAutoGen
 */

#include "../../src/core/trajCore/trajUtils.h"
#include <iostream>
#include <cassert>

/**
 * @brief 主测试入口
 * @details 构造测试用例，验证正常与异常场景
 */
int main() {
    // 用例1：正常轨迹测试
    Traj normalTraj;
    normalTraj.count = 3;
    normalTraj.points[0].X = 0.0;
    normalTraj.points[0].Y = 0.0;
    normalTraj.points[1].X = 10.0;
    normalTraj.points[1].Y = 0.0;
    normalTraj.points[2].X = 5.0;
    normalTraj.points[2].Y = 5.0;

    State queryState;
    queryState.X = 4.0;
    queryState.Y = 1.0;

    int foundIndex = 0;
    double foundDist = 0.0;
    int status = 0;

    // 调用一级函数 findClosestPointOnTraj
    status = findClosestPointOnTraj(queryState, &normalTraj, &foundIndex, &foundDist);

    // 验证结果 (最近点应为索引0，距离sqrt(17)约等于4.12，或索引1距离6.0，最近应为0)
    if (status == 0) {
        std::cout << "Test Normal: Success. Index: " << foundIndex << ", Dist: " << foundDist << std::endl;
        assert(foundIndex == 0); // (4-0)^2 + (1-0)^2 = 17, (4-10)^2 + (1-0)^2 = 37
    } else {
        std::cout << "Test Normal: Failed." << std::endl;
    }

    // 用例2：空轨迹异常测试
    Traj emptyTraj;
    emptyTraj.count = 0;
    
    int emptyStatus = 0;
    int emptyIndex = 0;
    double emptyDist = 0.0;

    emptyStatus = findClosestPointOnTraj(queryState, &emptyTraj, &emptyIndex, &emptyDist);
    
    if (emptyStatus == -1) {
        std::cout << "Test Empty: Success caught exception." << std::endl;
    } else {
        std::cout << "Test Empty: Failed to catch exception." << std::endl;
    }

    return 0;
}