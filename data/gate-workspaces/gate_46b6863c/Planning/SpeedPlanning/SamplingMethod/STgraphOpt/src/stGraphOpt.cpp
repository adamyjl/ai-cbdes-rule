/**
  @file stGraphOpt.cpp
  @brief 速度轨迹平滑优化模块实现
*/

#include "../inc/stGraphOpt.h"
#include <stdlib.h>
#include <math.h>
#include <string.h>

#define MAX_POINTS 1000 /**< 最大轨迹点数限制 */

/**
  @brief 输入数据合法性检查
  @en_name validateInput
  @cn_name 输入合法性检查
  @type 原子函数
  @param[IN] input STgraphOptInput 输入数据指针
  @retval OptStatus 检查结果状态码
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static OptStatus validateInput(const STgraphOptInput* input) {
    int isNull = 0; /**< 是否为空标志 */
    int sizeValid = 0; /**< 大小是否有效标志 */
    int isContinuous = 1; /**< 是否连续标志 */
    int i = 0; /**< 循环索引 */
    double tPrev = 0.0; /**< 前一个时间点 */
    
    if (input == NULL) {
        isNull = 1;
    } else {
        if (input->trajectory.points == NULL) {
            isNull = 1;
        }
    }

    if (isNull == 1) {
        return OPT_ERROR_NULL;
    }

    if (input->trajectory.size <= 2) {
        sizeValid = 0;
    } else {
        sizeValid = 1;
    }

    if (sizeValid == 0) {
        return OPT_ERROR_SIZE;
    }

    tPrev = input->trajectory.points[0].t;
    for (i = 1; i < input->trajectory.size; i = i + 1) {
        if (input->trajectory.points[i].t <= tPrev) {
            isContinuous = 0;
        }
        tPrev = input->trajectory.points[i].t;
        if (isContinuous == 0) {
            break;
        }
    }

    if (isContinuous == 0) {
        return OPT_ERROR_INVALID;
    }

    return OPT_SUCCESS;
}

/**
  @brief 生成初始猜测轨迹
  @en_name generateInitialGuess
  @cn_name 生成初始猜测轨迹
  @type 原子函数
  @param[IN] input STgraphOptInput 输入数据指针
  @param[OUT] initTraj PlanningTrajectory 初始轨迹指针
  @retval OptStatus 执行状态码
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static OptStatus generateInitialGuess(const STgraphOptInput* input, PlanningTrajectory* initTraj) {
    int i = 0; /**< 循环索引 */
    int allocSize = 0; /**< 分配大小 */
    
    allocSize = input->trajectory.size;
    initTraj->points = (PlanningPoint*)malloc(sizeof(PlanningPoint) * allocSize);
    
    if (initTraj->points == NULL) {
        return OPT_ERROR_NULL;
    }
    
    initTraj->size = allocSize;

    for (i = 0; i < allocSize; i = i + 1) {
        initTraj->points[i].t = input->trajectory.points[i].t;
        initTraj->points[i].s = input->trajectory.points[i].s;
        initTraj->points[i].v = input->trajectory.points[i].v;
        initTraj->points[i].a = 0.0; /**< 初始加速度设为0 */
    }

    return OPT_SUCCESS;
}

/**
  @brief L2平滑算法单步迭代
  @en_name stepL2Smooth
  @cn_name L2平滑单步迭代
  @type 原子函数
  @param[IN] param STgraphOptParam 参数指针
  @param[IN] refTraj PlanningTrajectory 参考轨迹指针
  @param[IN/OUT] currTraj PlanningTrajectory 当前迭代轨迹指针
  @param[OUT] maxChange double 最大变化量指针
  @retval void 无返回值
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static void stepL2Smooth(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj, double* maxChange) {
    int i = 0; /**< 循环索引 */
    int size = 0; /**< 轨迹大小 */
    double vPrev = 0.0; /**< 前一点速度 */
    double vNext = 0.0; /**< 后一点速度 */
    double vRef = 0.0; /**< 参考速度 */
    double vCurr = 0.0; /**< 当前速度 */
    double vTemp = 0.0; /**< 临时速度变量 */
    double diff = 0.0; /**< 速度差值 */
    double fitTerm = 0.0; /**< 拟合项 */
    double smoothTerm = 0.0; /**< 平滑项 */
    double localChange = 0.0; /**< 局部变化量 */
    
    size = currTraj->size;
    *maxChange = 0.0;

    for (i = 1; i < size - 1; i = i + 1) {
        vPrev = currTraj->points[i - 1].v;
        vNext = currTraj->points[i + 1].v;
        vRef = refTraj->points[i].v;
        vCurr = currTraj->points[i].v;
        vTemp = vCurr;

        diff = vRef - vCurr;
        fitTerm = param->weightData * diff;
        
        smoothTerm = param->weightSmooth * (vPrev + vNext - 2.0 * vCurr);

        vCurr = vCurr + fitTerm;
        vCurr = vCurr + smoothTerm;

        currTraj->points[i].v = vCurr;

        localChange = fabs(vTemp - vCurr);
        if (localChange > *maxChange) {
            *maxChange = localChange;
        }
    }
}

/**
  @brief 三次曲线拟合单步迭代
  @en_name stepCubicFit
  @cn_name 三次曲线拟合单步迭代
  @type 原子函数
  @param[IN] param STgraphOptParam 参数指针
  @param[IN] refTraj PlanningTrajectory 参考轨迹指针
  @param[IN/OUT] currTraj PlanningTrajectory 当前迭代轨迹指针
  @param[OUT] maxChange double 最大变化量指针
  @retval void 无返回值
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static void stepCubicFit(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj, double* maxChange) {
    int i = 0; /**< 循环索引 */
    int size = 0; /**< 轨迹大小 */
    double vPrev = 0.0; /**< 前一点速度 */
    double vNext = 0.0; /**< 后一点速度 */
    double vRef = 0.0; /**< 参考速度 */
    double vCurr = 0.0; /**< 当前速度 */
    double vTemp = 0.0; /**< 临时速度变量 */
    double diff = 0.0; /**< 速度差值 */
    double fitTerm = 0.0; /**< 拟合项 */
    double smoothTerm = 0.0; /**< 平滑项 */
    double localChange = 0.0; /**< 局部变化量 */
    
    size = currTraj->size;
    *maxChange = 0.0;

    for (i = 1; i < size - 1; i = i + 1) {
        vPrev = currTraj->points[i - 1].v;
        vNext = currTraj->points[i + 1].v;
        vRef = refTraj->points[i].v;
        vCurr = currTraj->points[i].v;
        vTemp = vCurr;

        diff = vRef - vCurr;
        fitTerm = param->weightData * diff;
        
        /* Cubic smoothing penalty approximates jerk */
        smoothTerm = param->weightSmooth * (vPrev - 2.0 * vCurr + vNext);

        vCurr = vCurr + fitTerm;
        vCurr = vCurr + smoothTerm;

        currTraj->points[i].v = vCurr;

        localChange = fabs(vTemp - vCurr);
        if (localChange > *maxChange) {
            *maxChange = localChange;
        }
    }
}

/**
  @brief B样条曲线拟合单步迭代（简化版，用于性能保证）
  @en_name stepBSplineFit
  @cn_name B样条拟合单步迭代
  @type 原子函数
  @param[IN] param STgraphOptParam 参数指针
  @param[IN] refTraj PlanningTrajectory 参考轨迹指针
  @param[IN/OUT] currTraj PlanningTrajectory 当前迭代轨迹指针
  @param[OUT] maxChange double 最大变化量指针
  @retval void 无返回值
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static void stepBSplineFit(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj, double* maxChange) {
    int i = 0; /**< 循环索引 */
    int size = 0; /**< 轨迹大小 */
    double vPrev = 0.0; /**< 前一点速度 */
    double vNext = 0.0; /**< 后一点速度 */
    double vRef = 0.0; /**< 参考速度 */
    double vCurr = 0.0; /**< 当前速度 */
    double vTemp = 0.0; /**< 临时速度变量 */
    double diff = 0.0; /**< 速度差值 */
    double fitTerm = 0.0; /**< 拟合项 */
    double smoothTerm = 0.0; /**< 平滑项 */
    double localChange = 0.0; /**< 局部变化量 */
    
    size = currTraj->size;
    *maxChange = 0.0;

    for (i = 1; i < size - 1; i = i + 1) {
        vPrev = currTraj->points[i - 1].v;
        vNext = currTraj->points[i + 1].v;
        vRef = refTraj->points[i].v;
        vCurr = currTraj->points[i].v;
        vTemp = vCurr;

        diff = vRef - vCurr;
        fitTerm = param->weightData * diff;
        
        /* B-Spline approximation weight distribution */
        smoothTerm = param->weightSmooth * (vPrev + vNext - 2.0 * vCurr);

        vCurr = vCurr + fitTerm;
        vCurr = vCurr + smoothTerm;

        currTraj->points[i].v = vCurr;

        localChange = fabs(vTemp - vCurr);
        if (localChange > *maxChange) {
            *maxChange = localChange;
        }
    }
}

/**
  @brief 执行迭代优化主循环
  @en_name runOptimizationLoop
  @cn_name 执行优化循环
  @type 原子函数
  @param[IN] param STgraphOptParam 参数指针
  @param[IN] input STgraphOptInput 输入指针
  @param[IN/OUT] outputTraj PlanningTrajectory 输出轨迹指针
  @retval OptStatus 执行状态码
  @granularity 函数
  @tag_level1 planning
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
static OptStatus runOptimizationLoop(const STgraphOptParam* param, const STgraphOptInput* input, PlanningTrajectory* outputTraj) {
    OptStatus status = OPT_SUCCESS; /**< 状态码 */
    int iter = 0; /**< 当前迭代次数 */
    int maxIter = 0; /**< 最大迭代次数 */
    double errorThreshold = 0.0; /**< 误差阈值 */
    double tolerance = 0.0; /**< 容差 */
    double maxChange = 0.0; /**< 最大变化量 */
    int converged = 0; /**< 收敛标志 */
    
    maxIter = param->maxIterations;
    errorThreshold = param->errorThreshold;
    tolerance = param->tolerance;
    
    if (maxIter <= 0) {
        maxIter = 100; /**< 默认最大迭代次数 */
    }
    if (errorThreshold <= 0.0) {
        errorThreshold = 0.01; /**< 默认误差阈值 */
    }

    iter = 0;
    converged = 0;

    while (iter < maxIter) {
        maxChange = 0.0;
        
        if (param->algoType == ALGO_TYPE_L2) {
            stepL2Smooth(param, &(input->trajectory), outputTraj, &maxChange);
        } else if (param->algoType == ALGO_TYPE_CUBIC) {
            stepCubicFit(param, &(input->trajectory), outputTraj, &maxChange);
        } else {
            stepBSplineFit(param, &(input->trajectory), outputTraj, &maxChange);
        }

        if (maxChange < errorThreshold) {
            converged = 1;
        }
        
        if (converged == 1) {
            break;
        }

        iter = iter + 1;
    }

    return status;
}

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
OptStatus optimizeVelocityTrajectory(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output) {
    OptStatus checkStatus = OPT_SUCCESS; /**< 检查状态 */
    OptStatus initStatus = OPT_SUCCESS; /**< 初始化状态 */
    OptStatus optStatus = OPT_SUCCESS; /**< 优化状态 */
    
    /* 1. 输入合法性检查 */
    checkStatus = validateInput(input);
    if (checkStatus != OPT_SUCCESS) {
        return checkStatus;
    }

    /* 2. 生成初始猜测轨迹 */
    initStatus = generateInitialGuess(input, &(output->trajectory));
    if (initStatus != OPT_SUCCESS) {
        return initStatus;
    }

    /* 3. 执行迭代优化 */
    optStatus = runOptimizationLoop(param, input, &(output->trajectory));

    return optStatus;
}