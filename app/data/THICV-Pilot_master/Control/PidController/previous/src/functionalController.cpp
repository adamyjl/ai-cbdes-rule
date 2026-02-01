/**
 * @brief PID功能
 * @file functionalController.cpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-12-12
 */
#include "functionalController.h"
using namespace Control;

/**
 * @brief 转化高斯坐标系到 东x北y theta:正东为0逆时针为正
 * @param[IN] param01 原有轨迹
 * @param[IN] input01 状态
 * @param[OUT] output01 轨迹输出
 * @cn_name: 高斯坐标转换
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void controllerTransferGauss2RightHand(ParamStruct01 &param01, InputStruct01 &input01, OutputStruct01 &output01){
  Traj trajRaw = param01.trajRaw;
  State s = input01.s;
  State s_=input01.s_;
  Traj trajNew;
  trajNew = transferGauss2RightHand(s, trajRaw, s_);
  output01.trajNew = trajNew;
}

/**
 * @brief 查找最近点ID. 比较曲线中每个点和当前点的距离
 * @param[IN] param02 Pid控制器类
 * @param[IN] input02 新参数配置
 * @param[OUT] output02 
 * @cn_name: 查找最近点ID
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void controllerGetNearestIndex(ParamStruct02 &param02, InputStruct02 &input02, OutputStruct02 &output02){
  State state = input02.state;
  Traj traj = param02.traj;
  int nID;
  nID = getNearestIndex(state, traj);
  output02.nID = nID;
}