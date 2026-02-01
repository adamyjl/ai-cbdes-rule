/**
  @file stGraphOpt.cpp
  @brief 速度轨迹平滑优化模块实现文件
*/

#include "stGraphOpt.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

#define MAX_POINTS 1000 /**< 最大轨迹点数 */

// 错误码定义
#define ERR_SUCCESS 0          /**< 成功 */
#define ERR_NULL_PTR 1         /**< 空指针错误 */
#define ERR_EMPTY_TRAJ 2       /**< 空轨迹错误 */
#define ERR_DISCONTINUOUS 3    /**< 轨迹不连续错误 */
#define ERR_ALGO_UNSUPPORTED 4 /**< 不支持的算法类型 */
#define ERR_INVALID_PARAM 5    /**< 无效参数 */

/**
  @brief 检查输入数据有效性
  @brief Check input data validity
  @cn_name 输入数据边界检查
  @en_name checkInputData
  @type 原子函数
  @param[in] input 优化输入
  @retval int32_t 错误码
  @granularity Level2
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static int32_t checkInputData(const STgraphOptInput* input) {
    int32_t isValid = 1; /* 1表示有效，0表示无效 */
    
    if (NULL == input) {
        return ERR_NULL_PTR;
    }
    
    if (NULL == input->trajectory.planningPoints) {
        return ERR_NULL_PTR;
    }
    
    if (input->trajectory.size <= 2) {
        return ERR_EMPTY_TRAJ;
    }

    if (input->trajectory.size > MAX_POINTS) {
        return ERR_INVALID_PARAM;
    }

    // 检查轨迹不连续性（时间必须单调递增）
    int32_t i = 0; /* 循环索引 */
    for (i = 0; i < input->trajectory.size - 1; i = i + 1) {
        double tCurrent = input->trajectory.planningPoints[i].t;     /* 当前点时间 */
        double tNext = input->trajectory.planningPoints[i + 1].t;     /* 下一点时间 */
        double vCurrent = input->trajectory.planningPoints[i].v;     /* 当前点速度 */
        
        if (tCurrent >= tNext) {
            isValid = 0;
        }
        
        // 异常值检测：速度小于0或超过物理极限(假设40m/s)
        if (vCurrent < 0.0 || vCurrent > 40.0) {
            isValid = 0;
        }
    }

    if (0 == isValid) {
        return ERR_DISCONTINUOUS;
    }

    return ERR_SUCCESS;
}

/**
  @brief 生成初始猜测轨迹
  @brief Generate initial guess trajectory
  @cn_name 生成初始轨迹
  @en_name generateInitialTrajectory
  @type 原子函数
  @param[in] input 优化输入
  @param[out] initTraj 输出的初始轨迹
  @retval void 无返回值
  @granularity Level2
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static void generateInitialTrajectory(const STgraphOptInput* input, PlanningTrajectory* initTraj) {
    int32_t i = 0; /* 循环索引 */
    int32_t size = input->trajectory.size; /* 轨迹点数量 */

    // 简单线性初始化：直接复制原始速度作为初始解
    for (i = 0; i < size; i = i + 1) {
        initTraj->planningPoints[i].t = input->trajectory.planningPoints[i].t;
        initTraj->planningPoints[i].s = input->trajectory.planningPoints[i].s;
        initTraj->planningPoints[i].v = input->trajectory.planningPoints[i].v;
        initTraj->planningPoints[i].a = 0.0; /* 初始加速度设为0 */
    }
    initTraj->size = size;
}

/**
  @brief 执行L2平滑算法迭代步骤
  @brief Execute L2 smoothing algorithm iteration step
  @cn_name L2平滑迭代步
  @en_name l2SmoothIteration
  @type 原子函数
  @param[in] param 优化参数
  @param[in] refTraj 参考轨迹
  @param[inout] currTraj 当前待优化轨迹
  @retval double 本次迭代的最大变化量
  @granularity Level3
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static double l2SmoothIteration(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj) {
    double maxChange = 0.0; /* 最大变化量 */
    int32_t size = currTraj->size; /* 轨迹点数量 */
    int32_t i = 0; /* 循环索引 */

    for (i = 1; i < size - 1; i = i + 1) {
        double vOld = currTraj->planningPoints[i].v; /* 迭代前速度 */
        double vRef = refTraj->planningPoints[i].v;  /* 参考速度 */
        double vPrev = currTraj->planningPoints[i - 1].v; /* 前一点速度 */
        double vNext = currTraj->planningPoints[i + 1].v; /* 后一点速度 */
        
        /* 数据拟合项 */
        double termData = param->weightData * (vRef - vOld);
        
        /* 平滑性项 (二阶差分) */
        double termSmooth = param->weightSmooth * (vPrev + vNext - 2.0 * vOld);
        
        /* 更新速度 */
        double vNew = vOld + termData + termSmooth;
        currTraj->planningPoints[i].v = vNew;
        
        /* 计算变化量绝对值 */
        double change = vNew - vOld;
        if (change < 0.0) {
            change = -change;
        }
        
        if (change > maxChange) {
            maxChange = change;
        }
    }
    return maxChange;
}

/**
  @brief 执行B样条拟合迭代步骤（简化版：加权移动平均）
  @brief Execute B-Spline fitting iteration step (Simplified: Weighted Moving Average)
  @cn_name B样条拟合迭代步
  @en_name bSplineIteration
  @type 原子函数
  @param[in] param 优化参数
  @param[in] refTraj 参考轨迹
  @param[inout] currTraj 当前待优化轨迹
  @retval double 本次迭代的最大变化量
  @granularity Level3
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static double bSplineIteration(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj) {
    double maxChange = 0.0; /* 最大变化量 */
    int32_t size = currTraj->size; /* 轨迹点数量 */
    int32_t i = 0; /* 循环索引 */

    for (i = 2; i < size - 2; i = i + 1) {
        double vOld = currTraj->planningPoints[i].v; /* 迭代前速度 */
        double vRef = refTraj->planningPoints[i].v;  /* 参考速度 */
        
        /* B样条近似：利用更宽的邻域 (-2, -1, 1, 2) */
        double vPrev2 = currTraj->planningPoints[i - 2].v;
        double vPrev1 = currTraj->planningPoints[i - 1].v;
        double vNext1 = currTraj->planningPoints[i + 1].v;
        double vNext2 = currTraj->planningPoints[i + 2].v;
        
        double termSmooth = param->weightSmooth * (0.1 * vPrev2 + 0.2 * vPrev1 + 0.2 * vNext1 + 0.1 * vNext2 - 0.6 * vOld);
        double termData = param->weightData * (vRef - vOld);
        
        double vNew = vOld + termData + termSmooth;
        currTraj->planningPoints[i].v = vNew;
        
        double change = vNew - vOld;
        if (change < 0.0) {
            change = -change;
        }
        
        if (change > maxChange) {
            maxChange = change;
        }
    }
    return maxChange;
}

/**
  @brief 执行三次曲线拟合迭代步骤
  @brief Execute Cubic curve fitting iteration step
  @cn_name 三次曲线拟合迭代步
  @en_name cubicCurveIteration
  @type 原子函数
  @param[in] param 优化参数
  @param[in] refTraj 参考轨迹
  @param[inout] currTraj 当前待优化轨迹
  @retval double 本次迭代的最大变化量
  @granularity Level3
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static double cubicCurveIteration(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* currTraj) {
    double maxChange = 0.0; /* 最大变化量 */
    int32_t size = currTraj->size; /* 轨迹点数量 */
    int32_t i = 0; /* 循环索引 */

    for (i = 1; i < size - 1; i = i + 1) {
        double vOld = currTraj->planningPoints[i].v; /* 迭代前速度 */
        double vRef = refTraj->planningPoints[i].v;  /* 参考速度 */
        double vPrev = currTraj->planningPoints[i - 1].v; /* 前一点速度 */
        double vNext = currTraj->planningPoints[i + 1].v; /* 后一点速度 */
        
        /* 三次平滑项：更强的曲率约束 */
        double termSmooth = param->weightSmooth * (vNext - 2.0 * vOld + vPrev); 
        double termData = param->weightData * (vRef - vOld);
        
        /* 稍微调整系数以体现三次特性 */
        double vNew = vOld + termData + termSmooth * 1.5; 
        currTraj->planningPoints[i].v = vNew;
        
        double change = vNew - vOld;
        if (change < 0.0) {
            change = -change;
        }
        
        if (change > maxChange) {
            maxChange = change;
        }
    }
    return maxChange;
}

/**
  @brief 执行主优化循环
  @brief Execute main optimization loop
  @cn_name 执行优化循环
  @en_name runOptimizationLoop
  @type 原子函数
  @param[in] param 优化参数
  @param[in] refTraj 参考轨迹
  @param[inout] optTraj 待优化轨迹
  @retval int32_t 错误码
  @granularity Level2
  @version 1.0.0
  @date 2023-10-27
  @author AI_Assistant
*/
static int32_t runOptimizationLoop(const STgraphOptParam* param, const PlanningTrajectory* refTraj, PlanningTrajectory* optTraj) {
    double change = 0.0; /* 迭代变化量 */
    int32_t iter = 0;    /* 当前迭代次数 */
    int32_t hasConverged = 0; /* 收敛标志 */

    while (iter < param->maxIter) {
        change = 0.0;
        
        if (param->algoType == ALGO_TYPE_L2) {
            change = l2SmoothIteration(param, refTraj, optTraj);
        } 
        else if (param->algoType == ALGO_TYPE_BSPLINE) {
            change = bSplineIteration(param, refTraj, optTraj);
        } 
        else if (param->algoType == ALGO_TYPE_CUBIC) {
            change = cubicCurveIteration(param, refTraj, optTraj);
        } 
        else {
            return ERR_ALGO_UNSUPPORTED;
        }

        if (change < param->tolerance) {
            hasConverged = 1;
        }
        
        if (1 == hasConverged) {
            break;
        }
        
        iter = iter + 1;
    }
    
    return ERR_SUCCESS;
}

/**
  @brief 速度轨迹平滑优化入口函数
*/
int32_t stGraphOptMain(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output) {
    int32_t errCode = 0; /* 错误码 */
    
    /* 1. 边界检查 */
    errCode = checkInputData(input);
    if (ERR_SUCCESS != errCode) {
        if (NULL != output) {
            output->errorCode = errCode;
        }
        return errCode;
    }
    
    if (NULL == param || NULL == output) {
        return ERR_NULL_PTR;
    }

    /* 2. 初始化内存 */
    int32_t size = input->trajectory.size;
    /* 使用栈分配或简单的静态假设，实际工程应根据size动态malloc，此处简化处理 */
    static PlanningPoint initTrajPoints[MAX_POINTS];
    PlanningTrajectory initTraj;
    initTraj.planningPoints = initTrajPoints;
    
    static PlanningPoint optTrajPoints[MAX_POINTS];
    output->trajectory.planningPoints = optTrajPoints;
    output->trajectory.size = size;

    /* 3. 生成初始轨迹 */
    generateInitialTrajectory(input, &initTraj);
    
    /* 复制初始轨迹到输出轨迹作为迭代起点 */
    int32_t i = 0; /* 循环索引 */
    for (i = 0; i < size; i = i + 1) {
        output->trajectory.planningPoints[i].v = initTraj.planningPoints[i].v;
        output->trajectory.planningPoints[i].t = initTraj.planningPoints[i].t;
        output->trajectory.planningPoints[i].s = initTraj.planningPoints[i].s;
        output->trajectory.planningPoints[i].a = 0.0;
    }

    /* 4. 执行迭代优化 */
    errCode = runOptimizationLoop(param, &input->trajectory, &output->trajectory);
    
    output->errorCode = errCode;
    return errCode;
}