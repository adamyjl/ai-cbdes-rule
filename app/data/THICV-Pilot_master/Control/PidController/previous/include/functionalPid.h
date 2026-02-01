/**
 * @brief 文件说明 
 * @file functionalPid.h
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-11-27
 */
#pragma once

#include <iostream>
#include <cmath>

#include "controlPIDController.hpp"

using namespace Control;

// pidControllerUpdate
typedef struct{
    PID c;
}ParamStruct01;

typedef struct{
    double errorInput;
}InputStruct01;

typedef struct{
    double controlOutput;
}OutputStruct01;


// pidControllerModifyGains
typedef struct{
    PID c;
}ParamStruct02;

typedef struct{
    double newKp;
    double newKi;
    double newKd;
}InputStruct02;

typedef struct{
  
}OutputStruct02;

// pidControllerResetI
typedef struct{
    PID c; 
}ParamStruct03;

typedef struct{
  
}InputStruct03;

typedef struct{
  
}OutputStruct03;

// pidLoadPIDYamlConfig
typedef struct{
    YAML::Node config; 
}ParamStruct04;

typedef struct{
    std::string name;
    double dt;
}InputStruct04;

typedef struct{
    PID pid;
}OutputStruct04;

// initialPIDController
typedef struct{
    std::string configFile;
}ParamStruct05;

typedef struct{
    double maxSteer;
    double ratioWheelToSteer;
    double dt;
}InputStruct05;

typedef struct{
    // PIDController pidController;
}OutputStruct05;

// pidPIDControllerCalcErrors
typedef struct{
    size_t nearestID;
    size_t previewID;
}ParamStruct06;

typedef struct{
    State state;
    Traj traj;
    // PIDLibs inPids;
}InputStruct06;

typedef struct{
    // PIDLibs outPids;
}OutputStruct06;


void pidControllerUpdate(ParamStruct01 &, InputStruct01 &, OutputStruct01 &);
void pidControllerModifyGains(ParamStruct02 &, InputStruct02 &, OutputStruct02 &);
void pidControllerResetI(ParamStruct03 &, InputStruct03 &, OutputStruct03 &);
void pidLoadPIDYamlConfig(ParamStruct04 &, InputStruct04 &, OutputStruct04 &);
void initialPIDController(ParamStruct05 &, InputStruct05 &, OutputStruct05 &);
void pidPIDControllerCalcErrors(ParamStruct06 &, InputStruct06 &, OutputStruct06 &);



// double pidControllerUpdate(PidController& c, double errorInput);
// void pidControllerModifyGains(PidController& c, double newKp, double newKi, double newKd);
// void pidControllerResetI(PidController& c);
