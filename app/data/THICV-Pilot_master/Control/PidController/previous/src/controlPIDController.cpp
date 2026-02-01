/**
 * @file controlPIDController.cc
 * @author yibin, yining (852488062@qq.com)
 * @brief PID控制器，PID横向运动控制器
 * @version 1.0
 * @date 2022-08-16
 *
 * @copyright Copyright (c) 2022
 *
 */
#include "controlPIDController.hpp"
#include "controlCubicSpline.h"
#include <algorithm>
#include <string>

#include "qingColor.h"
namespace Control
{
    /**
     * @brief Construct a new PID::PID object
     *
     * @param kp
     * @param ki
     * @param kd
     * @param dt 控制器周期
     * @param isThreshOn 是否打开积分器阈值
     * @param errorThresh 积分器阈值上限
     */
    PID::PID(double kp, double ki, double kd, double dt, bool isThreshOn, double errorThresh, double dThresh, bool isdThreshOn, double w)
    {
        this->kp = kp;
        this->ki = ki;
        this->kd = kd;
        this->eiThresh = errorThresh;
        this->isThreshOn = isThreshOn;
        this->dt = dt;
        this->w = w;
        this->dThresh=dThresh;
        this->isdThreshOn=isdThreshOn;
        eiDecayRatio = 0.95; //衰减系数

        ed = 0;
        ei = 0;
        isStarted = false;
    }

    double PID::update(double error)
    {
        //kd
        // 将当前的误差值error与上一次的误差值e相减并除以时间间隔dt，计算得到误差的微分值（ed）
        if (isStarted) {
            ed = (error - e) / dt;
        }
        else
            isStarted = true; // 如果是第一次更新（isStarted为假），那么将误差的微分值设为0（此时还没有上一次的误差值）

        // 对误差的微分值（ed）进行限制
        //如果启用了微分上限限制（isdThreshOn为真），那么将误差的微分值（ed）限制在一个指定的范围内（-dThresh到dThresh之间），避免微分项对控制器输出的影响过大
        if(isdThreshOn) {
            if (ed > dThresh)
                ed = dThresh;
            if (ed < -dThresh)
                ed = -dThresh;
        }

        // ki
        //计算误差的积分值（ki）
        //如果启用了积分上限限制（isThreshOn为真）并且当前误差的积分值（ei）的绝对值已经超过了设定的上限值（eiThresh），那么不再对误差进行积分，而是将当前误差值（error）乘上一个衰减系数（eiDecayRatio），使得积分值逐渐减小；
        //否则，将当前误差值乘以时间间隔（dt）并累加到误差的积分值（ei）中
        if (isThreshOn && fabs(ei) > eiThresh)
        {
            ei = error * eiDecayRatio; //积分器累加达到上限时，不再增加，直接衰减
        }
        else
        {
            ei += error * dt;
        }
        //更新误差的值（e）,将当前的误差值（error）保存到e中，以备下一次更新使用
        e = error;
        //将比例项、积分项和微分项加权求和

        return (kp * e + ki * ei + kd * ed) * w;
    }

    //接受三个新的增益参数值newKp、newKi、newKd，并将它们分别赋值给类成员变量kp、ki、kd，从而修改控制器的增益参数
    void PID::modifyGains(double newKp, double newKi, double newKd)
    {
        kp = newKp;
        ki = newKi;
        kd = newKd;
    }

    //重置误差积分器的值，将其置为0，以便在控制器重新开始控制时重新积分误差
    void PID::resetI() { ei = 0; }
    
    /**
     * @brief 读取 yaml 文件中pid_conf相关字段内容，并返回控制器
     *
     * @param config yaml node配置文件信息
     * @param name 控制误差名称
     * @param dt 控制器频率
     * @return PID
     */
    PID loadPIDYamlConfig(YAML::Node config, std::string name, double dt)
    {
        double kp = config["pid_conf"][name]["kp"].as<double>();
        double ki = config["pid_conf"][name]["ki"].as<double>();
        double kd = config["pid_conf"][name]["kd"].as<double>();

        bool isThreshOn = config["pid_conf"][name]["isThreshOn"].as<bool>();
        double thresh = config["pid_conf"][name]["errorThresh"].as<double>();
        bool isdThreshOn=config["pid_conf"][name]["isdThreshOn"].as<bool>();
        double dThresh=config["pid_conf"][name]["dThresh"].as<double>();

        double w = config["pid_conf"][name]["weight"].as<double>();

        PID pid(kp, ki, kd, dt, isThreshOn, thresh, dThresh,isdThreshOn,w);
        return pid;
    }

    // PIDController(std::string configFile);
    /**
     * @brief Construct a new PIDController::PIDController object
     *
     * @param configFile config file name. 控制配置文件地址
     */
    PIDController::PIDController(std::string configFile, double maxSteer, 
        double ratioWheelToSteer, double dt)
        : LatControllerBase(maxSteer, ratioWheelToSteer, dt)
    {
        std::cout << "construct pid contorller" << std::endl;
        YAML::Node config = YAML::LoadFile(configFile);

        wheelbase = config["wheelbase"].as<double>();

        // @@@lp
        steerGain = config["steerGain"].as<double>();

        //feedforwardWeight = config["feedforwardWeight"].as<double>();
        maxPreviewDistance = config["maxPreviewDistance"].as<double>();
        minPreviewDistance = config["minPreviewDistance"].as<double>();
        previewKV = config["previewKV"].as<double>();
        previewExpKC = config["previewExpKC"].as<double>();
        previewExpThre = config["previewExpThre"].as<double>();
        maxPreviewDistancePlusDelta = config["maxPreviewDistancePlusDelta"].as<double>();
        maxPreviewDistanceMinusDelta = config["maxPreviewDistanceMinusDelta"].as<double>();

        // PID distancePID = loadPIDYamlConfig(config, "distancePID", dt);
        // PID angleNPID = loadPIDYamlConfig(config, "angleNPID", dt);
        // PID anglePYawPID = loadPIDYamlConfig(config, "anglePYawPID", dt);
        PID anglePVecPID = loadPIDYamlConfig(config, "anglePVecPID", dt);

        // pidLibs.insert(std::pair<std::string, PID>("distancePID", distancePID));
        // pidLibs.insert(std::pair<std::string, PID>("angleNPID", angleNPID));
        // pidLibs.insert(std::pair<std::string, PID>("anglePYawPID", anglePYawPID));
        pidLibs.insert(std::pair<std::string, PID>("anglePVecPID", anglePVecPID));

        lastPreviewDistance = config["initialPreviewDistance"].as<double>();

        plusPreviewPoint=config["plusPreviewPoint"].as<bool>();
        plusPreviewPointweight=config["plusPreviewPointweight"].as<double>();

    };
    
    /**
     * @brief 获取误差向量
     *
     * @param state 车辆状态
     * @param traj 待跟踪轨迹
     * @param nearestID 当前点ID
     * @param previewID 预瞄点ID
     * @return PIDLibs 控制器. 同时更新到私有变量中
     */
    PIDLibs PIDController::calcErrors(State state, const Traj &traj, size_t nearestID, size_t previewID)
    {
        // double errorcal_yaw=(M_PI / 2-state.yaw)/ M_PI * 180;
        // 注意符号，误差为正时，应该右打方向盘

        //计算车辆当前位置与最近轨迹点之间的距离误差 trackError
        // double trackError = get2Dis(traj[nearestID].x, state.x, traj[nearestID].y, state.y);
        // double dxl = traj[nearestID].x - state.x;
        // double dyl = traj[nearestID].y - state.y;
        // double angle = normalizeRad(traj[nearestID].yaw - std::atan2(dyl, dxl));
        // if (angle > M_PI)
        //     trackError = trackError * -1;
        // pidLibs["distancePID"].update(trackError);


        //车辆姿态与最近轨迹点的方向之间的角度误差 angleError
        // double angleError = errorcal_yaw-traj[nearestID].yaw;
        // pidLibs["angleNPID"].update(angleError);

        //计算预瞄点轨迹与车辆航向之间的角度误差 anglePYawError
        // double anglePYawError = errorcal_yaw - traj[previewID].yaw;
        // pidLibs["anglePYawPID"].update(anglePYawError);
        // std::cout<<"previewID:"<<previewID<<",  detla:"<<anglePYawError<<std::endl;
        // std::cout<<errorcal_yaw<<', '<<traj[previewID].yaw<<std::endl;


        // 计算车辆姿态与预瞄点轨迹之间的角度误差 anglePVecError
        if(state.yaw < -M_PI){
            state.yaw+=2.0*M_PI;
        }

        double anglePVecError = state.yaw - atan2(traj[previewID].y - state.y, traj[previewID].x - state.x);
        //
        if(abs(traj[previewID].y - state.y)<0.01 && abs(traj[previewID].x - state.x)<0.01){
            anglePVecError=0;
        }

        if(anglePVecError < - M_PI){
            anglePVecError += 2.0*M_PI;
        }
        else if(anglePVecError > M_PI){
            anglePVecError -= 2.0*M_PI;
        }

        YawError = anglePVecError;

        std::cout<<"@@@@@@@@traj[previewID].y "<<traj[previewID].y<<std::endl;
        std::cout<< state.y<<std::endl;
        std::cout<<traj[previewID].x<<std::endl;
        std::cout<<state.x<<std::endl;

        std::cout <<RED<< "\tstate.yaw(rad): " << state.yaw <<" \tangle(previewID to vehicle state(rad)): " << atan2(traj[previewID].y - state.y, traj[previewID].x - state.x)
                    <<"\n"<< "\tYawAnglePVecError: " << anglePVecError  << RESET<<std::endl;

        pidLibs["anglePVecPID"].update(anglePVecError);

        // std::cout << "nearestID: " << nearestID << std::endl;
        std::cout << "previewID: " << previewID << std::endl;
        std::cout << "previewIDYaw: " << traj[previewID].yaw << std::endl;

        std::cout << BOLDCYAN;
        // std::cout << "errorcal_yaw: " << errorcal_yaw << std::endl;
        // std::cout << "trackError: " << trackError << std::endl;
        // std::cout << "angleError: " << angleError << std::endl;
        // std::cout << "anglePYawError: " << trackError << std::endl;
        std::cout << "anglePVecError: " << anglePVecError << std::endl;
        std::cout << RESET;

        return pidLibs;
    };

} // namespace Control
