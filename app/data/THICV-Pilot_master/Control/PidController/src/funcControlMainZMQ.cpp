/**
 * @brief 控制主函数
 * @file funcControlMainZMQ.cpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-12-26
 */

#include "funcControlMainZMQ.hpp"


// 将 IMU 数据转换为车辆状态信息的函数。
// 它接受一个 IMU::Imu 类型的参数 vehStateProto，以及一个 Control::State 类型的引用 state。
// 函数将 IMU 数据中的一些字段赋值给车辆状态信息中对应的字段。

/**
 * @brief 反序列化字符串，提取【状态】信息
 * @param[IN] param01 stateBuf socket收到的buffer
 * @param[IN] input01 state 自车状态
 * @param[OUT] output01 轨迹输出
 * @cn_name: 解析车辆状态
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseStateData(MainZMQParamStruct01 &param01, MainZMQInputStruct01 &input01, MainZMQOutputStruct01 &output01)
{
    IMU::Imu vehStateProto = param01.vehStateProto;
    Control::State state = input01.inputState;
    state.x = vehStateProto.gaussx();
    state.y = vehStateProto.gaussy();
    state.yaw = vehStateProto.yaw() / 180.0 * M_PI; //将其转换为弧度制
    state.rtkMode = vehStateProto.gpsvalid();
    state.v = vehStateProto.velocity();
    output01.outputState = state;
}

/**
 * @brief 反序列化字符串，提取【轨迹】信息
 * @param[IN] trajProto 接受两个参数：trajProto是一个Planning命名空间中的TrajectoryPointVec类型，代表规划器生成的轨迹数据；
 * @param[IN] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @param[OUT] trajRaw 待跟踪轨迹,trajRaw是一个Control命名空间中的Traj类型，代表转换后的轨迹数据。
 * @cn_name: 解析车辆轨迹
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void parseTrajData(MainZMQParamStruct02 &param02, MainZMQInputStruct02 &input02, MainZMQOutputStruct02 &output02)
{
    Planning::TrajectoryPointVec trajProto = param02.trajProto;
    Control::Traj &trajRaw = input02.trajRaw;
    //将规划器（Planning）生成的轨迹数据（trajectoryPoints）转换成控制器（Control）需要的轨迹数据格式（trajRaw）。采用了Google的protobuf库中的数据类型（trajProto）
    //将其转换为一个vector类型的轨迹（trajRaw）。
    //使用trajectoryPoints()函数从trajProto中获取轨迹点集合，然后使用一个for循环逐个遍历这些轨迹点，并将其转换为Control::TrajPoint类型，最后添加到trajRaw中
    
    auto trajectoryPoints = trajProto.trajectorypoints();
    trajRaw.clear();
    for (const auto &tp : trajectoryPoints)
    {
        trajRaw.push_back(Control::TrajPoint{tp.x(), tp.y(), tp.theta(), tp.speed(), tp.curvature(), tp.s()});
    }
    output02.trajRaw = trajRaw;
}