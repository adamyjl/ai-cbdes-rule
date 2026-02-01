/**
  @file stGraphOpt.h
  @brief 速度轨迹平滑优化模块头文件
*/

#ifndef ST_GRAPH_OPT_H
#define ST_GRAPH_OPT_H

#ifdef __cplusplus
extern "C" {
#endif

/**
  @brief 算法类型枚举
*/
typedef enum {
    ALGO_TYPE_L2 = 0,    /**< L2平滑模式 */
    ALGO_TYPE_BSPLINE,   /**< B样条曲线拟合模式 */
    ALGO_TYPE_CUBIC      /**< 三次曲线拟合模式 */
} AlgoType;

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
  @field points Array<PlanningPoint*, 动态分配> 轨迹点数组指针
  @field size int 轨迹点数量
*/
typedef struct {
    PlanningPoint* points; /**< 轨迹点数组 */
    int size;              /**< 轨迹点数量 */
} PlanningTrajectory;

/**
  @brief 优化参数结构体
  @field algoType AlgoType 算法类型选择
  @field maxIterations int 最大迭代次数
  @field errorThreshold double 误差阈值
  @field weightData double 数据拟合权重
  @field weightSmooth double 平滑性权重
  @field tolerance double 收敛容差（兼容旧版接口）
*/
typedef struct {
    AlgoType algoType;      /**< 算法类型 */
    int maxIterations;      /**< 最大迭代次数 */
    double errorThreshold;  /**< 误差阈值 */
    double weightData;      /**< 数据拟合权重 */
    double weightSmooth;    /**< 平滑性权重 */
    double tolerance;       /**< 收敛容差 */
} STgraphOptParam;

/**
  @brief 优化输入结构体
  @field trajectory PlanningTrajectory 原始轨迹数据
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 待处理的规划轨迹 */
} STgraphOptInput;

/**
  @brief 优化输出结构体
  @field trajectory PlanningTrajectory 优化后的平滑速度轨迹
*/
typedef struct {
    PlanningTrajectory trajectory; /**< 优化后的平滑速度轨迹 */
} STgraphOptOutput;

/**
  @brief 状态码枚举
*/
typedef enum {
    OPT_SUCCESS = 0,     /**< 优化成功 */
    OPT_ERROR_NULL,     /**< 输入为空错误 */
    OPT_ERROR_SIZE,     /**< 数据量不足错误 */
    OPT_ERROR_INVALID,  /**< 数据异常错误 */
    OPT_ERROR_PARAM     /**< 参数配置错误 */
} OptStatus;

/**
  @brief 速度轨迹平滑优化主入口函数
  @en_name optimizeVelocityTrajectory
  @cn_name 速度轨迹平滑优化
  @type 复合函数
  @param[IN] param STgraphOptParam 优化参数配置
  @param[IN] input STgraphOptInput 优化输入数据
  @param[OUT] output STgraphOptOutput 优化输出结果
  @var 无
  @retval OptStatus 状态码
  @granularity 模块
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
OptStatus optimizeVelocityTrajectory(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output);

#ifdef __cplusplus
}
#endif

#endif // ST_GRAPH_OPT_H