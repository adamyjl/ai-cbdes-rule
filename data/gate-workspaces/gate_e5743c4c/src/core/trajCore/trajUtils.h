/**
 * @file trajUtils.h
 * @brief 轨迹处理工具头文件，定义状态与轨迹结构及相关接口
 * @details 本模块提供轨迹匹配相关的数据结构与核心函数接口，遵循C语言规范书写。
 * @date 2023-10-27
 * @author SystemAutoGen
 */

#ifndef TRAJ_UTILS_H_
#define TRAJ_UTILS_H_

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief 轨迹点最大数量约束
 * @details 定义轨迹处理能力的上限，用于静态数组分配或循环边界检查
 */
#define MAX_TRAJ_POINTS 1000

/**
 * @brief 状态结构体，包含二维坐标信息
 * @details 用于表示当前车辆状态或轨迹中的单个点
 */
typedef struct {
    double X; /**< X方向坐标，单位：m */
    double Y; /**< Y方向坐标，单位：m */
} State;

/**
 * @brief 轨迹结构体，包含轨迹点集合
 * @details 存储一条完整的路径信息，包含点集及当前有效点数
 */
typedef struct {
    int count; /**< 轨迹点当前数量，范围：[0, MAX_TRAJ_POINTS] */
    State points[MAX_TRAJ_POINTS]; /**< 轨迹点数组，Array<State, MAX_TRAJ_POINTS> */
} Traj;

/**
 * @brief 查找最近轨迹点
 * @en_name findClosestPointOnTraj
 * @cn_name 查找最近轨迹点
 * @type 复合函数
 * @param state 输入参数，当前状态，包含x, y坐标
 * @param traj 输入参数，轨迹数据结构
 * @param index 输出参数，最近点的索引
 * @param distance 输出参数，最近点的欧氏距离
 * @retval int 执行结果，0表示成功，-1表示轨迹为空异常
 * @granularity 模块级
 * @tag_level1 轨迹匹配
 * @tag_level2 最近邻搜索
 * @formula dist = sqrt((x1-x2)^2 + (y1-y2)^2)
 * @version 1.0
 * @date 2023-10-27
 * @author SystemAutoGen
 * @note 此函数为顶层入口，包含异常处理逻辑与循环控制
 */
int findClosestPointOnTraj(State state, const Traj *traj, int *index, double *distance);

#ifdef __cplusplus
}
#endif

#endif // TRAJ_UTILS_H_