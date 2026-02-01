/**
 * @brief PID功能
 * @file functionalPid.cpp
 * @version 0.0.1
 * @author Chaoyi Chen (chency2023@tsinghua.edu.cn)
 * @date 2023-11-27
 */
#include "functionalPid.h"
using namespace Control;

/**
 * @brief PID输出
 * @param[IN] param01 Pid控制器类
 * @param[IN] input01 误差输入
 * @param[OUT] output01 控制输出
 * @cn_name: PID状态更新
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void pidControllerUpdate(ParamStruct01 &param01, InputStruct01 &input01, OutputStruct01 &output01){
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
 * @cn_name: PID增益修改
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void pidControllerModifyGains(ParamStruct02 &param02, InputStruct02 &input02, OutputStruct02 &output02){
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
 * @cn_name: PID积分重置
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void pidControllerResetI(ParamStruct03 &param03, InputStruct03 &input03, OutputStruct03 &output03){
  PID &c = param03.c;
  c.resetI();
// void pidControllerResetI(PidController& c){
//   c.resetI();
// }
}

/**
 * @brief 读取 yaml 文件中pid_conf相关字段内容，并返回控制器
 * @param[IN] param04 config yaml node配置文件信息
 * @param[IN] input04 name 控制误差名称 dt 控制器频率
 * @param[OUT] output04 
 * @cn_name: 读取yaml
 * @granularity: atomic
 */
void pidLoadPIDYamlConfig(ParamStruct04 &param04, InputStruct04 &input04, OutputStruct04 &output04){
  YAML::Node config = param04.config;
  std::string name = input04.name;
  double dt = input04.dt;
  PID pid = loadPIDYamlConfig(config, name, dt);
}

/**
 * @brief PID参数初始化
 * @param[IN] param05 配置文件
 * @param[IN] input05 最大转角限制 转向比
 * @param[OUT] output04 
 * @cn_name: PID初始化
 * @granularity: atomic
 */
void initialPIDController(ParamStruct05 &param05, InputStruct05 &input05, OutputStruct05 &output05){
  std::string configFile = param05.configFile;
  double maxSteer = input05.maxSteer;
  double ratioWheelToSteer = input05.ratioWheelToSteer;
  double dt = input05.dt;
  // 暂无使用
  // PIDController pidController;
  // output05.pidController
}

/**
 * @brief PID误差计算
 * @param[IN] param06 最近点ID 预瞄点ID
 * @param[IN] input06 车辆状态
 * @param[OUT] output04 
 * @cn_name: PID误差计算
 * @granularity: atomic
 */
void pidPIDControllerCalcErrors(ParamStruct06 &param06, InputStruct06 &input06, OutputStruct06 &output06){
  size_t nearestID = param06.nearestID;
  size_t previewID = param06.previewID;
  State state = input06.state;
  Traj traj = input06.traj;
  // 暂无使用
  // PIDLibs inPids = input06.inPids;
}
