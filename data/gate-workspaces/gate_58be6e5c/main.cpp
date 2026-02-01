#include <iostream>
#include <iomanip>
#include "TrajMatcher/trajMatcher.h"

/**
 * @brief 主函数入口
 * @details 演示 findNearestTrajPoint 函数的调用与结果输出
 * @return int 程序退出码
 * @version 1.0.0
 * @date 2023-10-27
 * @author System
 */
int main() {
    /* 定义测试状态 */
    State testState;
    testState.x = 1.5;
    testState.y = 1.5;

    /* 定义测试轨迹点数据 */
    const int pointNum = 3;
    TrajPoint trajDataArray[3];
    
    /* 初始化轨迹点1 */
    trajDataArray[0].x = 0.0;
    trajDataArray[0].y = 0.0;
    trajDataArray[0].t = 0.0;
    trajDataArray[0].v = 5.0;
    
    /* 初始化轨迹点2 */
    trajDataArray[1].x = 2.0;
    trajDataArray[1].y = 2.0;
    trajDataArray[1].t = 1.0;
    trajDataArray[1].v = 5.5;
    
    /* 初始化轨迹点3 */
    trajDataArray[2].x = 3.0;
    trajDataArray[2].y = 3.0;
    trajDataArray[2].t = 2.0;
    trajDataArray[2].v = 6.0;

    /* 构造轨迹对象 */
    Traj testTraj;
    testTraj.points = trajDataArray;
    testTraj.count = pointNum;

    /* 调用匹配函数 */
    MatchResult result = findNearestTrajPoint(testState, testTraj);

    /* 输出结果 */
    std::cout << "Nearest Index: " << result.index << std::endl;
    std::cout << "Euclidean Distance: " << std::fixed << std::setprecision(4) << result.distance << std::endl;

    /* 测试空轨迹情况 */
    Traj emptyTraj;
    emptyTraj.points = NULL;
    emptyTraj.count = 0;
    MatchResult emptyResult = findNearestTrajPoint(testState, emptyTraj);
    std::cout << "Empty Traj Index: " << emptyResult.index << std::endl;

    return 0;
}