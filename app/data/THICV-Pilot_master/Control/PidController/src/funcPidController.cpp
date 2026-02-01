#include "funcPidController.hpp"
using namespace Control;

/**
 * @brief PID控制函数
 * @file funcPidController.cpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.com)
 * @date 2024-01-31
 */

/**
 * @brief PID输出
 * @param[IN] param01 Pid控制器类
 * @param[IN] input01 误差输入
 * @param[OUT] output01 控制输出
 * @cn_name: 计算PID输出
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void updatePID(UpdateParamStruct &param01, UpdateInputStruct &input01, UpdateOutputStruct &output01){
  PID &c = param01.c;
  double errorInput = input01.errorInput;
  double controlOutput = c.update(errorInput);
  output01.controlOutput = controlOutput;
}
// double update(PidController& c, double errorInput){
//   double controlOutput = c.update(errorInput);
//   return controlOutput;
// }

/**
 * @brief PID增益修改
 * @param[IN] param02 Pid控制器类
 * @param[IN] input02 新参数配置
 * @param[OUT] output02 
 * @cn_name: 修改PID增益
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void modifyGainsInPID(ModifyGainsParamStruct &param02, ModifyGainsInputStruct &input02, ModifyGainsOutputStruct &output02){
  PID &c = param02.c;
  double newKp = input02.newKp;
  double newKi = input02.newKi;
  double newKd = input02.newKd;
  c.modifyGains(newKp, newKi, newKd);
}
// void modifyGains(PidController& c, double newKp, double newKi, double newKd){
//   c.modifyGains(newKp, newKi, newKd);
// }

/**
 * @brief PID积分重置
 * @param[IN] param03 Pid控制器类
 * @param[IN] input03 
 * @param[OUT] output03 
 * @cn_name: 重置PID积分
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void resetIInPID(ResetIParamStruct &param03, ResetIInputStruct &input03, ResetIOutputStruct &output03){
  PID &c = param03.c;
  c.resetI();
// void pidControllerResetI(PidController& c){
//   c.resetI();
// }
}

