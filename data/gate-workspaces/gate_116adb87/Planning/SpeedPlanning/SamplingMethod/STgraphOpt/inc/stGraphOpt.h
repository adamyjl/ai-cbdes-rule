/**
  @file stGraphOpt.h
  @brief 速度轨迹平滑优化模块头文件
*/

#ifndef ST_GRAPH_OPT_H
#define ST_GRAPH_OPT_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

/**
  @brief 算法类型枚举
  @var ALGORITHM_TYPE_BSPLINE B样条曲线拟合
  @var ALGORITHM_TYPE_L2 L2平滑
  @var ALGORITHM_TYPE_CUBIC 三次曲线拟合
*/
typedef enum {
    ALGORITHM_TYPE_BSPLINE = 0,
    ALGORITHM_TYPE_L2 = 1,
    ALGORITHM_TYPE_CUBIC = 2
} AlgorithmType;

/**
  @brief 规划点结构体
  @field t 时间, 单位: s
  @field s 距离, 单位: m
  @field v 速度, 单位: m/s
  @field a 加速度, 单位: m/s^2
*/
typedef struct {
    double t; /**< 时间, 单位: s */
    double s; /**< 距离, 单位: m */
    double v; /**< 速度, 单位: m/s */
    double a; /**< 加速度, 单位: m/s^2 */
} PlanningPoint;

/**
  @brief 规划轨迹结构体
  @field planningPoints 规划点数组, 单位: 无
  @field size 规划点数量, 单位: 无
*/
typedef struct {
    PlanningPoint* planningPoints; /**< 规划点数组, 单位: 无 */
    int32_t size; /**< 规划点数量, 单位: 无 */
} PlanningTrajectory;

/**
  @brief 优化参数结构体
  @field algorithmType 算法类型, 单位: 无
  @field maxIterations 最大迭代次数, 单位: 无
  @field errorThreshold 误差阈值, 单位: 无
  @field weightData 数据拟合权重, 单位: 无
  @field weightSmooth 平滑性权重, 单位: 无
*/
typedef struct {
    AlgorithmType algorithmType; /**< 算法类型, 单位: 无 */
    int32_t maxIterations; /**< 最大迭代次数, 单位: 无 */
    double errorThreshold; /**< 误差阈值, 单位: 无 */
    double weightData; /**< 数据拟合权重, 单位: 无 */
    double weightSmooth; /**< 平滑性权重, 单位: 无 */
} STgraphOptParam;

/**
  @brief 优化输入结构体
  @field trajectory 待处理的原始轨迹数据, 单位: 无
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 待处理的原始轨迹数据, 单位: 无 */
} STgraphOptInput;

/**
  @brief 优化输出结构体
  @field trajectory 优化后的平滑速度轨迹, 单位: 无
  @field errorCode 错误码, 单位: 无
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 优化后的平滑速度轨迹, 单位: 无 */
    int32_t errorCode; /**< 错误码, 单位: 无 */
} STgraphOptOutput;

/**
  @brief 错误码定义
  @var ERROR_OK 无错误
  @var ERROR_INPUT_EMPTY 输入轨迹为空
  @var ERROR_INPUT_SIZE 输入轨迹点数量不足
  @var ERROR_INPUT_DISCONTINUOUS 输入轨迹数据不连续
  @var ERROR_INPUT_INVALID 输入轨迹存在异常值
*/
#define ERROR_OK 0
#define ERROR_INPUT_EMPTY -1
#define ERROR_INPUT_SIZE -2
#define ERROR_INPUT_DISCONTINUOUS -3
#define ERROR_INPUT_INVALID -4

/**
  @brief 速度轨迹平滑优化主函数
  @en_name speedTrajectorySmoothingOptimization
  @cn_name 速度轨迹平滑优化
  @type 复合函数
  @param[in] param 优化参数
  @param[in] input 优化输入
  @param[out] output 优化输出
  @var 无
  @retval 无
  @granularity 模块
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
void speedTrajectorySmoothingOptimization(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output);

#ifdef __cplusplus
}
#endif

#endif // ST_GRAPH_OPT_H