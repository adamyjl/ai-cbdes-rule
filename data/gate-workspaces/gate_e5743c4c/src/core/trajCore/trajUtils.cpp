/**
 * @file trajUtils.cpp
 * @brief 轨迹处理工具实现文件
 * @details 实现状态与轨迹的匹配算法，严格遵循ANSI C标准与代码规范
 * @date 2023-10-27
 * @author SystemAutoGen
 */

#include "trajUtils.h"
#include <cmath>
#include <stdexcept>

/**
 * @brief 计算两点间欧氏距离平方
 * @en_name calcSquaredDistance
 * @cn_name 计算距离平方
 * @type 原子函数
 * @param xDiff 输入参数，X方向坐标差值
 * @param yDiff 输入参数，Y方向坐标差值
 * @retval double 距离的平方值
 * @granularity 函数级
 * @tag_level1 基础计算
 * @tag_level2 几何运算
 * @formula dist_sq = dx^2 + dy^2
 * @version 1.0
 * @date 2023-10-27
 * @author SystemAutoGen
 * @note 避免开方运算以提高性能，仅在最后一步计算真实距离
 */
static double calcSquaredDistance(double xDiff, double yDiff) {
    double xSquare = xDiff * xDiff;
    double ySquare = yDiff * yDiff;
    double sum = xSquare + ySquare;
    return sum;
}

/**
 * @brief 计算两点间欧氏距离
 * @en_name calcEuclideanDistance
 * @cn_name 计算欧氏距离
 * @type 原子函数
 * @param p1 输入参数，第一个点坐标
 * @param p2 输入参数，第二个点坐标
 * @retval double 欧氏距离值
 * @granularity 函数级
 * @tag_level1 基础计算
 * @tag_level2 几何运算
 * @formula dist = sqrt((x1-x2)^2 + (y1-y2)^2)
 * @version 1.0
 * @date 2023-10-27
 * @author SystemAutoGen
 */
static double calcEuclideanDistance(State p1, State p2) {
    double dx = p1.X - p2.X; // 计算X方向差值
    double dy = p1.Y - p2.Y; // 计算Y方向差值
    double distSq = calcSquaredDistance(dx, dy);
    double dist = std::sqrt(distSq);
    return dist;
}

/**
 * @brief 更新最近点信息
 * @en_name updateClosestInfo
 * @cn_name 更新最近点信息
 * @type 原子函数
 * @param currentDist 输入参数，当前计算的距离
 * @param currentIdx 输入参数，当前点的索引
 * @param minDist 输入/输出参数，当前最小距离指针
 * @param minIdx 输入/输出参数，当前最小距离索引指针
 * @retval void 无返回值
 * @granularity 函数级
 * @tag_level1 逻辑控制
 * @tag_level2 数据更新
 * @version 1.0
 * @date 2023-10-27
 * @author SystemAutoGen
 */
static void updateClosestInfo(double currentDist, int currentIdx, double *minDist, int *minIdx) {
    *minDist = currentDist;
    *minIdx = currentIdx;
}

/**
 * @brief 检查轨迹是否有效
 * @en_name checkTrajValid
 * @cn_name 检查轨迹有效性
 * @type 原子函数
 * @param traj 输入参数，轨迹指针
 * @retval int 1表示有效，0表示无效（空）
 * @granularity 函数级
 * @tag_level1 异常处理
 * @tag_level2 参数校验
 * @version 1.0
 * @date 2023-10-27
 * @author SystemAutoGen
 */
static int checkTrajValid(const Traj *traj) {
    int isValid = 0;
    if (traj != NULL) {
        if (traj->count > 0) {
            isValid = 1;
        }
    }
    return isValid;
}

/**
 * @brief 查找最近轨迹点（主逻辑实现）
 * @details 遍历轨迹点，计算欧氏距离，返回最小距离对应的索引和距离
 */
int findClosestPointOnTraj(State state, const Traj *traj, int *index, double *distance) {
    int validFlag = checkTrajValid(traj);
    int result = 0;

    if (validFlag == 0) {
        result = -1;
    } else {
        int i = 0; // 循环变量，显式声明
        int minIdx = 0; // 当前最小距离索引
        double minDist = 0.0; // 当前最小距离
        
        // 初始化第一个点的距离作为基准
        State firstPoint = traj->points[0];
        minDist = calcEuclideanDistance(state, firstPoint);

        // 循环遍历剩余轨迹点
        for (i = 1; i < traj->count; i = i + 1) {
            State currentPoint = traj->points[i];
            double currentDist = calcEuclideanDistance(state, currentPoint);
            
            // 比较距离大小（禁止复合赋值，展开逻辑）
            int isCloser = 0;
            if (currentDist < minDist) {
                isCloser = 1;
            }

            if (isCloser == 1) {
                updateClosestInfo(currentDist, i, &minDist, &minIdx);
            }
        }

        *index = minIdx;
        *distance = minDist;
    }

    return result;
}