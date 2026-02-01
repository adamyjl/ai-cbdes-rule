/**
 * @file controlPIDController.hpp
 * @author yibin, yining (852488062@qq.com)
 * @brief PID控制器 和 PID横向控制器
 * @version 1.0
 * @date 2022-08-16
 * 
 * @copyright Copyright (c) 2022
 * 
 */
#ifndef _CONTROL_PID_CONTROLLER_H
#define _CONTROL_PID_CONTROLLER_H
#include "controlData.hpp"
#include "controlController.hpp"
#include <math.h>
#include <unistd.h>
#include <string>
#include <thread>
#include <iostream>
#include <vector>
#include <map>
#include <yaml-cpp/yaml.h>

namespace Control {

    /**
     * @brief PID 控制器类
     * 
     */
    class PID
    {
    private:
        double e;   //期望值与实际值之间的差距
        double ei;  //error integral. 误差积分，误差随时间的累积量
        double ed;  // delta error. 误差求导，误差在时间上的变化率

        double kp;          // 比例增益，放大误差
        double ki;             //积分增益，消除静态误差
        double kd;          //微分增益， 预测误差变化趋势

        double w;           //权重。加权PID计算

        double dt;  //控制器频率，对误差微分进行离散化
        bool isStarted; //标识控制器是否已启动

        double dThresh; //微分上限
        bool isdThreshOn;   //是否启用微分上限

        // 积分饱和处理
        bool isThreshOn;    //是否启用积分饱和处理
        double eiThresh, eiDecayRatio; //eiThresh积分饱和阈值，用于限制积分项的最大值；eiDecayRatio积分项衰减系数，用于限制积分项的累积

    public:
        PID(double kp, double ki, double kd, double dt, bool isThreshOn, double errorThresh, double dThresh, bool isdThreshOn, double w);
        PID():PID(0,0,0,0,0,0,0,0,1){};        // 不能删，否则没有复制构造函数？
        ~PID(){};
        //更新控制器状态，并返回输出控制量
        double update(double error);
        //返回 PID 计算的输出控制量
        double output(){return w*(kp*e+kd*ed+ki*ei);}
        //用于修改 PID 控制器的比例、积分、微分增益
        void modifyGains(double kp, double ki, double kd);
        //用于重置积分项的值
        void resetI();
    };

    using PIDLibs = std::map<std::string, PID>;  
    PID loadPIDYamlConfig(YAML::Node config, std::string name, double dt);
    
    /**
     * @brief PID横向运动控制器
     * 
     * 继承横向控制虚基类LatControllerBase。通过前馈+反馈生成控制量，算法原理
     * 详见设计文档。
     * @sa controlPIDController.cc 横向控制PID类的具体实现方法
     */
    class PIDController: public LatControllerBase
    {
    public:
        //传入一个配置文件的路径、最大转向角度、轮胎转向比例、以及控制器频率
        PIDController(std::string configFile, double maxSteer, 
            double ratioWheelToSteer=20, double dt=0.1);
        ~PIDController() {};
        double calcSteer(State s, const Traj& traj, size_t nearestID);
        //计算前馈角度，需要传入当前状态、轨迹信息、当前轨迹点ID和下一个轨迹点ID
        double calcFeedForwardAngle(State state, const Traj& traj, int nID, int rID);

    private:

        PIDLibs calcErrors(State state, const Traj& traj, size_t nID, size_t pID);
        double calcPreviewDis(State state, const Traj& traj, size_t nID) ;
        int getPreviewID(double previewDistance, const Traj& traj, size_t nID);
        double calcFeedback();

        //初始预瞄点，设置为0，后用轨迹最近点替换
        size_t lastpreviewID=0;

        double wheelbase; //轴距

        PIDLibs pidLibs;    //PID误差实例集合

        double feedforwardWeight; //前馈权重

        double lastPreviewDistance;
        double maxPreviewDistancePlusDelta;
        double maxPreviewDistanceMinusDelta;

        double minPreviewDistance;
        double maxPreviewDistance;

        double previewKV;
        double previewExpKC;
        double previewExpThre;

        bool plusPreviewPoint;
        double plusPreviewPointweight;

        double steerGain;
        double YawError = 0;

        //TODO 可视化方便debug.赋值
        TrajPoint previewPoint; //预瞄点
        TrajPoint currentPoint; //当前点

    };
}
#endif