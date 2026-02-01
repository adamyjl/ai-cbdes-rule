/**
 * @brief PID功能
 * @file functionalController.h
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-12-12
 */
#pragma once

#include <iostream>
#include <cmath>

#include "controlController.hpp"

using namespace Control;

// controllerTransferGauss2RightHand
typedef struct{
    Traj trajRaw;
}ParamStruct01;

typedef struct{
    State s;
    State s_;
}InputStruct01;

typedef struct{
    Traj trajNew;
}OutputStruct01;

// controllerGetNearestIndex
typedef struct{
    Traj traj;
}ParamStruct02;

typedef struct{
    State state;
}InputStruct02;

typedef struct{
    int nID;
}OutputStruct02;

void controllerTransferGauss2RightHand(ParamStruct01 &, InputStruct01 &, OutputStruct01 &);
void controllerGetNearestIndex(ParamStruct02 &, InputStruct02 &, OutputStruct02 &);