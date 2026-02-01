/**
 * @file controlData.hpp
 * @author yibin, yining (852488062@qq.com)
 * @brief 模块使用数据类型
 * @version 1.0
 * @date 2022-08-16
 * 
 * @copyright Copyright (c) 2022
 * 
 */
#ifndef _CONTROL_DATA_H
#define _CONTROL_DATA_H

#include <cmath>
#include <vector>
#include <iostream>

//C++的命名空间Control，包含了一些结构体和类型别名
namespace Control{
/**
 * @brief 输入车辆位置信息
*/
//存储了当前车辆状态的信息
struct State
{
    double x;       //高斯x
    double y;       //高斯y
    double yaw; //横摆角，航向角
    double v;       //车辆当前速度
    double rtkMode;     //IMU的定位状态
};

//存储了路径跟踪的轨迹信息
struct  TrajPoint
{
    double x;
    double y;
    double yaw;       // 切向角度
    double v;           //速度
    double k;        //曲率
    double s;       //累积路程
};

//Traj类型别名表示由多个轨迹点构成的轨迹。
using Traj = std::vector<TrajPoint>;

// 输出 control command存储了计算出的控制命令的信息
struct ControlCMD
{
    double steer;     //期望前轮转角
    double speed;       // 期望车速
};

}

#endif