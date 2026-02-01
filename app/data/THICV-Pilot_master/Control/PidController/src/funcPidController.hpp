/**
 * @brief PID控制函数
 * @file funcPidController.hpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.com)
 * @date 2024-01-31
 */

#pragma once

#include <iostream>
#include <cmath>

#include "controlPIDController.hpp"

using namespace Control;

// pidControllerUpdate
typedef struct{
    PID c;
}UpdateParamStruct;

typedef struct{
    double errorInput;
}UpdateInputStruct;

typedef struct{
    double controlOutput;
}UpdateOutputStruct;


// pidControllerModifyGains
typedef struct{
    PID c;
}ModifyGainsParamStruct;

typedef struct{
    double newKp;
    double newKi;
    double newKd;
}ModifyGainsInputStruct;

typedef struct{
  
}ModifyGainsOutputStruct;

// pidControllerResetI
typedef struct{
    PID c; 
}ResetIParamStruct;

typedef struct{
  
}ResetIInputStruct;

typedef struct{
  
}ResetIOutputStruct;

// pidLoadPIDYamlConfig
typedef struct{
    YAML::Node config; 
}ConfigParamStruct;

typedef struct{
    std::string name;
    double dt;
}ConfigInputStruct;

typedef struct{
    PID pid;
}ConfigOutputStruct;

// initialPIDController
typedef struct{
    std::string configFile;
}InitialParamStruct;

typedef struct{
    double maxSteer;
    double ratioWheelToSteer;
    double dt;
}InitialInputStruct;

typedef struct{
    // PIDController pidController;
}InitialOutputStruct;

// pidPIDControllerCalcErrors
typedef struct{
    size_t nearestID;
    size_t previewID;
}CalcErrorsParamStruct;

typedef struct{
    State state;
    Traj traj;
    // PIDLibs inPids;
}CalcErrorsInputStruct;

typedef struct{
    // PIDLibs outPids;
}CalcErrorsOutputStruct;

/**
 * @brief PID输出
 * @param[IN] param01 Pid控制器类
 * @param[IN] input01 误差输入
 * @param[OUT] output01 控制输出
 * @cn_name: 计算PID输出
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void updatePID(UpdateParamStruct &, UpdateInputStruct &, UpdateOutputStruct &);

/**
 * @brief PID增益修改
 * @param[IN] param02 Pid控制器类
 * @param[IN] input02 新参数配置
 * @param[OUT] output02 
 * @cn_name: 修改PID增益
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void modifyGainsInPID(ModifyGainsParamStruct &, ModifyGainsInputStruct &, ModifyGainsOutputStruct &);

/**
 * @brief PID积分重置
 * @param[IN] param03 Pid控制器类
 * @param[IN] input03 
 * @param[OUT] output03 
 * @cn_name: 重置PID积分
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void resetIInPID(ResetIParamStruct &, ResetIInputStruct &, ResetIOutputStruct &);




// double pidControllerUpdate(PidController& c, double errorInput);
// void pidControllerModifyGains(PidController& c, double newKp, double newKi, double newKd);
// void pidControllerResetI(PidController& c);