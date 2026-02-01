/**
 * @brief 控制器函数
 * @file funcControlController.cpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.com)
 * @date 2024-01-04
 */

#include "funcControlController.hpp"

/**
 * @brief 由车辆状态生成控制指令
 * @param[IN] param s 车辆状态， trajRaw 原始车辆轨迹
 * @param[IN] input controller 控制器
 * @param[OUT] cmd 输出控制指令
 * @cn_name: 计算车辆控制指令
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcControlCMD(ControlCMDParamStruct01 &param03, ControlCMDInputStruct01 &input03, ControlCMDOutputStruct01 &output03)
{
    Control::Traj traj = param03.trajRaw;
    Control::State state = param03.s;
    Control::Controller &controller = input03.inController;
    Control::ControlCMD cmd = controller.calcControlCMD(state, traj);
    output03.cmd = cmd;
    output03.outController = controller;
}

/**
 * @brief 由车辆状态，车辆原始轨迹计算期望速度
 * @param[IN] param s 车辆状态， trajRaw 待跟踪轨迹
 * @param[IN] input nearestID traj中最近点ID
 * @param[OUT] output speedoutput 期望速度
 * @cn_name: 计算期望速度
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcSpeed(CalcSpeedParamStruct &param, CalcSpeedInputStruct &input, CalcSpeedOutputStruct &output)
{
    Control::State s = param.s;
    Control::Traj trajRaw = param.trajRaw;
    size_t nearestID = input.nearestID;
    Control::LonController &lonController = input.lonController;
    double speedoutput = lonController.calcSpeed(s,trajRaw,nearestID);
    output.speedoutput = speedoutput;
}

/**
 * @brief 转化高斯坐标系到右手坐标系
 * @param[IN] transferGauss2RightHandParamStruct,车辆状态, 原始车辆轨迹
 * @param[IN] transferGauss2RightHandInputStruc,转置后的车辆状态
 * @param[OUT] transferGauss2RightHandOutputStruct, 坐标系转置后的车辆轨迹
 * @cn_name: 转化高斯坐标系到右手坐标系
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void transferGauss2RightHand(transferGauss2RightHandParamStruct &param, transferGauss2RightHandInputStruct &input, transferGauss2RightHandOutputStruct &output)
{
    Control::State state = param.sIn;
    Control::Traj traj = param.trajIn;
    Control::State state_ = input.s_;
    Control::Traj traj_ = Control::transferGauss2RightHand(state,traj,state_);
    output.trajOut = traj_;
    output.sOut = state_;
}

/**
 * @brief 查找最近点ID
 * @param[IN] getNearestIndexParamStruct,车辆状态, 待跟踪轨迹
 * @param[IN] getNearestIndexInputStruct,无
 * @param[OUT] getNearestIndexOutputStruct, 查找到的最近点ID
 * @cn_name: 查找最近路点
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void getNearestIndex(getNearestIndexParamStruct &param, getNearestIndexInputStruct &input, getNearestIndexOutputStruct &output)
{
    Control::Traj trajIn = param.traj;
    Control::State stateIn = param.state;
    int nearestID = Control::getNearestIndex(stateIn,trajIn);
    output.nearestIndex = nearestID;
}

/**
 * @brief 计算期望前轮转角
 * @param[IN] CalcSteerParamStruct 车辆状态，待跟踪轨迹
 * @param[IN] CalcSteerInputStruct traj中最近点ID
 * @param[OUT] CalcSteerOutputStruct 期望前轮转向角
 * @cn_name: 计算期望前轮转角
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcSteer(CalcSteerParamStruct &param, CalcSteerInputStruct &input, CalcSteerOutputStruct &output)
{
    Control::Traj trajIn = param.trajRaw;
    Control::State stateIn = param.s;
    size_t nearestIndex = input.nearestID;
    Control::PIDController &pidController = input.ptrLatController;
    double steeroutput = ptrLatController->calcSteer(stateIn,trajIn,nearestIndex);
    output.steeroutput = steeroutput;
}