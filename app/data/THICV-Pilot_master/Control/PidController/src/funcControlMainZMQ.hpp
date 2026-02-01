/**
 * @brief 控制主函数
 * @file funcControlMainZMQ.hpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-12-26
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
 * @brief 反序列化字符串，提取【状态】信息
 * @param[IN] param01 stateBuf socket收到的buffer
 * @param[IN] input01 state 自车状态
 * @param[OUT] output01 轨迹输出
 * @cn_name: 解析车辆状态
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseStateData(MainZMQParamStruct01 &param01, MainZMQInputStruct01 &input01, MainZMQOutputStruct01 &output01);

/**
 * @brief 反序列化字符串，提取【轨迹】信息
 * @param[IN] trajProto 接受两个参数：trajProto是一个Planning命名空间中的TrajectoryPointVec类型，代表规划器生成的轨迹数据；
 * @param[IN] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @param[OUT] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @cn_name: 解析车辆轨迹
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseTrajData(MainZMQParamStruct02 &param02, MainZMQInputStruct02 &input02, MainZMQOutputStruct02 &output02);