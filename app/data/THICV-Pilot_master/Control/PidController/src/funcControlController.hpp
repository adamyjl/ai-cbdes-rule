/**
 * @brief 控制器函数
 * @file funcControlController.hpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.com)
 * @date 2024-01-04
 */
#pragma once

#include <chrono>
#include <future>
#include <iostream>
#include <map>
#include <signal.h>
#include <sstream>
#include <string>
#include <thread>
#include <zmq.h>
#include "qingColor.h"

#include <iomanip>

#include "controlController.hpp"
#include "controlData.hpp"

#include <imu.pb.h>
#include <control.pb.h>
#include <PlanningMsg.pb.h>

typedef struct{
    Control::Traj trajRaw;
    Control::State s;
}ControlCMDParamStruct01;

typedef struct{
    Control::Controller inController;
}ControlCMDInputStruct01;

typedef struct{
    Control::ControlCMD cmd;
    Control::Controller outController;
}ControlCMDOutputStruct01;

/**
 * @brief 由车辆状态生成控制指令
 * @param[IN] param s 车辆状态， trajRaw 原始车辆轨迹
 * @param[IN] input controller 控制器
 * @param[OUT] cmd 输出控制指令
 * @cn_name: 计算车辆控制指令
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcControlCMD(ControlCMDParamStruct01 &param03, ControlCMDInputStruct01 &input03, ControlCMDOutputStruct01 &output03);


typedef struct{
    Control::Traj trajRaw;
    Control::State s;
}CalcSpeedParamStruct;

typedef struct{
    size_t nearestID;
    Control::LonController lonController;
}CalcSpeedInputStruct;

typedef struct{
    double speedoutput;
}CalcSpeedOutputStruct;

/**
 * @brief 由车辆状态，车辆原始轨迹计算期望速度
 * @param[IN] param s 车辆状态， trajRaw 待跟踪轨迹
 * @param[IN] input nearestID traj中最近点ID
 * @param[OUT] output speedoutput 期望速度
 * @cn_name: 计算期望速度
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcSpeed(CalcSpeedParamStruct &param, CalcSpeedInputStruct &input, CalcSpeedOutputStruct &output);

typedef struct{
    Control::Traj trajIn;
    Control::State sIn;
}transferGauss2RightHandParamStruct;

typedef struct{
    Control::State s_;
}transferGauss2RightHandInputStruct;

typedef struct{
    Control::Traj trajOut;
    Control::State sOut;
}transferGauss2RightHandOutputStruct;

/**
 * @brief 转化高斯坐标系到右手坐标系
 * @param[IN] transferGauss2RightHandParamStruct,车辆状态, 原始车辆轨迹
 * @param[IN] transferGauss2RightHandInputStruc,转置后的车辆状态
 * @param[OUT] transferGauss2RightHandOutputStruct, 坐标系转置后的车辆轨迹
 * @cn_name: 转化高斯坐标系到右手坐标系
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void transferGauss2RightHand(transferGauss2RightHandParamStruct &param, transferGauss2RightHandInputStruct &input, transferGauss2RightHandOutputStruct &output);

typedef struct{
    Control::Traj traj;
    Control::State state;
}getNearestIndexParamStruct;

typedef struct{
    
}getNearestIndexInputStruct;

typedef struct{
    int nearestIndex;
}getNearestIndexOutputStruct;

/**
 * @brief 查找最近点ID
 * @param[IN] getNearestIndexParamStruct,车辆状态, 待跟踪轨迹
 * @param[IN] getNearestIndexInputStruct,无
 * @param[OUT] getNearestIndexOutputStruct, 查找到的最近点ID
 * @cn_name: 查找最近路点
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void getNearestIndex(getNearestIndexParamStruct &param, getNearestIndexInputStruct &input, getNearestIndexOutputStruct &output);



typedef struct{
    Control::Traj trajRaw;
    Control::State s;
}CalcSteerParamStruct;

typedef struct{
    size_t nearestID;
    Control::LatControllerBase *ptrLatController;
}CalcSteerInputStruct;

typedef struct{
    double steeroutput;
}CalcSteerOutputStruct;
/**
 * @brief 计算期望前轮转角
 * @param[IN] CalcSteerParamStruct 车辆状态，待跟踪轨迹
 * @param[IN] CalcSteerInputStruct traj中最近点ID
 * @param[OUT] CalcSteerOutputStruct 期望前轮转向角
 * @cn_name: 计算期望前轮转角
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcSteer(CalcSteerParamStruct &param, CalcSteerInputStruct &input, CalcSteerOutputStruct &output);