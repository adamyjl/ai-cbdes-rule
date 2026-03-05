/**
  @file stGraphOpt.cpp
  @brief 速度轨迹平滑优化模块源文件
*/

#include "../../inc/stGraphOpt.h"
#include <stdlib.h>
#include <math.h>

#define ABS(x) ((x) > 0 ? (x) : -(x))

/**
  @brief 检查输入数据有效性
  @en_name checkInputValidity
  @cn_name 输入有效性检查
  @type 原子函数
  @param[in] input 优化输入
  @retval int32_t 错误码
  @granularity 函数
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
static int32_t checkInputValidity(const STgraphOptInput* input) {
    int32_t isValid = 0;
    int32_t i = 0;
    double dt = 0.0;
    double prevT = 0.0;
    PlanningPoint* points = NULL;
    int32_t size = 0;

    points = input->trajectory.planningPoints;
    size = input->trajectory.size;

    if (points == NULL) {
        isValid = ERROR_INPUT_EMPTY;
        return isValid;
    }

    if (size <= 2) {
        isValid = ERROR_INPUT_SIZE;
        return isValid;
    }

    prevT = points[0].t;
    
    for (i = 1; i < size; i = i + 1) {
        dt = points[i].t - prevT;
        if (dt <= 0.0001) { 
            isValid = ERROR_INPUT_DISCONTINUOUS;
            return isValid;
        }
        if (points[i].v < 0.0) {
            isValid = ERROR_INPUT_INVALID;
            return isValid;
        }
        prevT = points[i].t;
    }

    isValid = ERROR_OK;
    return isValid;
}

/**
  @brief 生成初始猜测轨迹
  @en_name generateInitialGuess
  @cn_name 生成初始猜测
  @type 原子函数
  @param[in] input 优化输入
  @param[out] outputTrajectory 输出轨迹缓冲区
  @retval void
  @granularity 函数
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
static void generateInitialGuess(const STgraphOptInput* input, PlanningTrajectory* outputTrajectory) {
    int32_t i = 0;
    int32_t size = 0;
    PlanningPoint* srcPoints = NULL;
    PlanningPoint* dstPoints = NULL;

    srcPoints = input->trajectory.planningPoints;
    size = input->trajectory.size;
    dstPoints = outputTrajectory->planningPoints;

    for (i = 0; i < size; i = i + 1) {
        dstPoints[i].t = srcPoints[i].t;
        dstPoints[i].s = srcPoints[i].s;
        dstPoints[i].v = srcPoints[i].v; 
        dstPoints[i].a = 0.0;
    }
}

/**
  @brief L2平滑迭代步骤
  @en_name performL2SmoothingStep
  @cn_name 执行L2平滑步
  @type 原子函数
  @param[in] param 优化参数
  @param[in] inputTrajectory 输入轨迹
  @param[in,out] outputTrajectory 输出轨迹
  @param[out] change 累计变化量
  @retval void
  @granularity 函数
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
static void performL2SmoothingStep(const STgraphOptParam* param, const PlanningTrajectory* inputTrajectory, PlanningTrajectory* outputTrajectory, double* change) {
    int32_t i = 0;
    int32_t size = 0;
    double vTemp = 0.0;
    double vNew = 0.0;
    double diff = 0.0;
    double smoothTerm = 0.0;
    double dataTerm = 0.0;
    const PlanningPoint* inPoints = NULL;
    PlanningPoint* outPoints = NULL;

    size = inputTrajectory->size;
    inPoints = inputTrajectory->planningPoints;
    outPoints = outputTrajectory->planningPoints;

    for (i = 1; i < size - 1; i = i + 1) {
        vTemp = outPoints[i].v;

        dataTerm = param->weightData * (inPoints[i].v - vTemp);
        smoothTerm = param->weightSmooth * (outPoints[i - 1].v + outPoints[i + 1].v - 2.0 * vTemp);
        
        vNew = vTemp + dataTerm + smoothTerm;
        
        outPoints[i].v = vNew;

        diff = vNew - vTemp;
        if (diff < 0.0) {
            diff = -diff;
        }
        *change = *change + diff;
    }
}

/**
  @brief 三次曲线拟合平滑迭代步骤
  @en_name performCubicSmoothingStep
  @cn_name 执行三次平滑步
  @type 原子函数
  @param[in] param 优化参数
  @param[in] inputTrajectory 输入轨迹
  @param[in,out] outputTrajectory 输出轨迹
  @param[out] change 累计变化量
  @retval void
  @granularity 函数
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
static void performCubicSmoothingStep(const STgraphOptParam* param, const PlanningTrajectory* inputTrajectory, PlanningTrajectory* outputTrajectory, double* change) {
    int32_t i = 0;
    int32_t size = 0;
    double vTemp = 0.0;
    double vNew = 0.0;
    double diff = 0.0;
    double smoothTerm = 0.0;
    double dataTerm = 0.0;
    const PlanningPoint* inPoints = NULL;
    PlanningPoint* outPoints = NULL;
    double prevV = 0.0;
    double currV = 0.0;
    double nextV = 0.0;

    size = inputTrajectory->size;
    inPoints = inputTrajectory->planningPoints;
    outPoints = outputTrajectory->planningPoints;

    for (i = 1; i < size - 1; i = i + 1) {
        vTemp = outPoints[i].v;
        prevV = outPoints[i - 1].v;
        currV = outPoints[i].v;
        nextV = outPoints[i + 1].v;

        dataTerm = param->weightData * (inPoints[i].v - currV);
        
        smoothTerm = param->weightSmooth * (prevV - 2.0 * currV + nextV);
        
        vNew = currV + dataTerm + smoothTerm;
        
        outPoints[i].v = vNew;

        diff = vNew - vTemp;
        if (diff < 0.0) {
            diff = -diff;
        }
        *change = *change + diff;
    }
}

/**
  @brief B样条拟合平滑迭代步骤（简化版：使用局部加权平均近似）
  @en_name performBSplineSmoothingStep
  @cn_name 执行B样条平滑步
  @type 原子函数
  @param[in] param 优化参数
  @param[in] inputTrajectory 输入轨迹
  @param[in,out] outputTrajectory 输出轨迹
  @param[out] change 累计变化量
  @retval void
  @granularity 函数
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
static void performBSplineSmoothingStep(const STgraphOptParam* param, const PlanningTrajectory* inputTrajectory, PlanningTrajectory* outputTrajectory, double* change) {
    int32_t i = 0;
    int32_t size = 0;
    double vTemp = 0.0;
    double vNew = 0.0;
    double diff = 0.0;
    double smoothTerm = 0.0;
    double dataTerm = 0.0;
    const PlanningPoint* inPoints = NULL;
    PlanningPoint* outPoints = NULL;

    size = inputTrajectory->size;
    inPoints = inputTrajectory->planningPoints;
    outPoints = outputTrajectory->planningPoints;

    for (i = 2; i < size - 2; i = i + 1) {
        vTemp = outPoints[i].v;

        dataTerm = param->weightData * (inPoints[i].v - vTemp);
        
        smoothTerm = param->weightSmooth * (outPoints[i - 2].v + 4.0 * outPoints[i - 1].v + 6.0 * outPoints[i].v + 4.0 * outPoints[i + 1].v + outPoints[i + 2].v - 16.0 * outPoints[i].v) / 16.0;
        
        vNew = vTemp + dataTerm + smoothTerm;
        
        outPoints[i].v = vNew;

        diff = vNew - vTemp;
        if (diff < 0.0) {
            diff = -diff;
        }
        *change = *change + diff;
    }
}

/**
  @brief 速度轨迹平滑优化主函数实现
  @en_name speedTrajectorySmoothingOptimization
  @cn_name 速度轨迹平滑优化
  @type 复合函数
  @param[in] param 优化参数
  @param[in] input 优化输入
  @param[out] output 优化输出
  @var 无
  @retval void
  @granularity 模块
  @tag_level1 规划
  @tag_level2 速度规划
  @version 1.0.0
  @date 2023-10-27
  @author AI_Coder
*/
void speedTrajectorySmoothingOptimization(const STgraphOptParam* param, const STgraphOptInput* input, STgraphOptOutput* output) {
    int32_t checkResult = 0;
    int32_t size = 0;
    PlanningTrajectory* tempTrajectory = NULL;
    double change = 0.0;
    int32_t iter = 0;
    int32_t maxIter = 0;
    double errThresh = 0.0;
    AlgorithmType algoType = ALGORITHM_TYPE_L2;

    checkResult = checkInputValidity(input);
    output->errorCode = checkResult;
    
    if (checkResult != ERROR_OK) {
        return;
    }

    size = input->trajectory.size;
    output->trajectory.size = size;
    output->trajectory.planningPoints = (PlanningPoint*)malloc(sizeof(PlanningPoint) * size);
    
    if (output->trajectory.planningPoints == NULL) {
        output->errorCode = ERROR_INPUT_EMPTY; 
        return;
    }

    generateInitialGuess(input, &(output->trajectory));

    maxIter = param->maxIterations;
    errThresh = param->errorThreshold;
    algoType = param->algorithmType;

    change = errThresh + 1.0; 
    iter = 0;

    while (iter < maxIter) {
        if (change < errThresh) {
            break;
        }

        change = 0.0;

        if (algoType == ALGORITHM_TYPE_L2) {
            performL2SmoothingStep(param, &(input->trajectory), &(output->trajectory), &change);
        }
        else if (algoType == ALGORITHM_TYPE_CUBIC) {
            performCubicSmoothingStep(param, &(input->trajectory), &(output->trajectory), &change);
        }
        else if (algoType == ALGORITHM_TYPE_BSPLINE) {
            performBSplineSmoothingStep(param, &(input->trajectory), &(output->trajectory), &change);
        }

        iter = iter + 1;
    }
}