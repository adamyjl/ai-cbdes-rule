/**
 * @brief 控制主函数
 * @file funcCommonTools.hpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2024-02-03
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
 * @cn_name: 车辆控制指令生成
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcControlCMD(ControlCMDParamStruct01 &param03, ControlCMDInputStruct01 &input03, ControlCMDOutputStruct01 &output03);



// parseStateData
typedef struct{
    IMU::Imu vehStateProto;
}MainZMQParamStruct01;

typedef struct{
    Control::State inputState;
}MainZMQInputStruct01;

typedef struct{
    Control::State outputState;
}MainZMQOutputStruct01;

/**
 * @brief 反序列化字符串，提取【状态】信息
 * @param[IN] param01 stateBuf socket收到的buffer
 * @param[IN] input01 state 自车状态
 * @param[OUT] output01 轨迹输出
 * @cn_name: 车辆状态解析
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseStateData(MainZMQParamStruct01 &param01, MainZMQInputStruct01 &input01, MainZMQOutputStruct01 &output01);

// parseStateData
typedef struct{
    Planning::TrajectoryPointVec trajProto;
}MainZMQParamStruct02;

typedef struct{
    Control::Traj trajRaw;
}MainZMQInputStruct02;

typedef struct{
    Control::Traj trajRaw;
}MainZMQOutputStruct02;

/**
 * @brief 反序列化字符串，提取【轨迹】信息
 * @param[IN] trajProto 接受两个参数：trajProto是一个Planning命名空间中的TrajectoryPointVec类型，代表规划器生成的轨迹数据；
 * @param[IN] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @param[OUT] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @cn_name: 车辆轨迹解析
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseTrajData(MainZMQParamStruct02 &param02, MainZMQInputStruct02 &input02, MainZMQOutputStruct02 &output02);

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
 * @cn_name: 查找最近点ID
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void getNearestIndex(getNearestIndexParamStruct &param, getNearestIndexInputStruct &input, getNearestIndexOutputStruct &output);


/**
 * @brief 读取 yaml 文件中pid_conf相关字段内容，并返回控制器
 * @param[IN] param04 config yaml node配置文件信息
 * @param[IN] input04 name 控制误差名称 dt 控制器频率
 * @param[OUT] output04 
 * @cn_name: 读取PID控制参数
 * @granularity: atomic
 */
void loadYamlConfig(ConfigParamStruct &, ConfigInputStruct &, ConfigOutputStruct &);
