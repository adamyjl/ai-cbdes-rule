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
  @brief 优化算法类型枚举
*/
typedef enum {
    ALGO_TYPE_L2 = 0,      /**< L2平滑算法 */
    ALGO_TYPE_BSPLINE = 1, /**< B样条曲线拟合算法 */
    ALGO_TYPE_CUBIC = 2    /**< 三次曲线拟合算法 */
} AlgorithmType;

/**
  @brief 优化参数结构体
*/
typedef struct {
    AlgorithmType algoType; /**< 算法类型选择 */
    double tolerance;       /**< 误差阈值，单位：m/s */
    double weightData;      /**< 数据拟合权重 */
    double weightSmooth;    /**< 平滑性权重 */
    int32_t maxIter;        /**< 最大迭代次数 */
} STgraphOptParam;

/**
  @brief 规划点结构体
*/
typedef struct {
    double t; /**< 时间，单位：s */
    double s; /**< 位移，单位：m */
    double v; /**< 速度，单位：m/s */
    double a; /**< 加速度，单位：m/s^2 */
} PlanningPoint;

/**
  @brief 规划轨迹结构体
*/
typedef struct {
    PlanningPoint* planningPoints; /**< 规划点数组 */
    int32_t size;                  /**< 规划点数量 */
} PlanningTrajectory;

/**
  @brief 优化输入结构体
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 待处理的原始轨迹数据 */
} STgraphOptInput;

/**
  @brief 优化输出结构体
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 优化后的平滑速度轨迹 */
    int32_t errorCode;             /**< 错误码，0表示成功 */
} STgraphOptOutput;

/**
  @brief 速度轨迹平滑优化入口函数
  @brief Speed trajectory smoothing optimization entry function
  @cn_name 速度轨迹平滑优化
  @en_name stGraphOptMain
  @type 复合函数
  @param[in] param 优化参数，包含容差、数据权重和平滑权重等配置
  @param[in] input 优化输入，包含待处理的规划轨迹
  @param[out] output 优化输出，用于存储处理后的平滑速度轨迹
  @retval int32_t 执行结果，0表示成功，非0表示错误
  @granularity Level1
  @tag_level1 Planning
  @tag_level2 SpeedPlanning
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
int32_t stGraphOptMain(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output);

#ifdef __cplusplus
}
#endif

#endif // ST_GRAPH_OPT_H