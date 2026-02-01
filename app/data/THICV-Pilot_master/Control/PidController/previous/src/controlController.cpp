/**
 * @file controlController.cc
 * @author yibin, yining (852488062@qq.com)
 * @brief 横纵向控制器基类实现
 * @version 1.0
 * @date 2022-08-16
 *
 * @copyright Copyright (c) 2022
 *
 */
#include <cmath>
#include <exception>
#include <limits>
#include <stdlib.h>

#include "controlController.hpp"
#include "controlCubicSpline.h"
#include "controlPIDController.hpp"
// #include "controlLQRController.hpp"
// #include "controlMPCController.hpp"
#include "qingColor.h"

int speedZeroFlag = 0;

namespace Control
{

    // 转化高斯坐标系到 东x北y theta:正东为0逆时针为正
    Traj transferGauss2RightHand(const State &s, const Traj &trajRaw, State &s_)
    {
        s_.x = s.y;
        s_.y = s.x;
        s_.yaw=M_PI/2.0-s.yaw;
        s_.rtkMode = s.rtkMode;

        Traj trajRaw_;
        trajRaw_.clear();
        TrajPoint p_;
        for (const auto &p : trajRaw)
        {
            p_.x = p.y;
            p_.y = p.x;
            p_.yaw = p.yaw;
            p_.v = p.v;
            p_.k = p.k;
            p_.s = p.s;
            p_.obsDIS = p.obsDIS;
            trajRaw_.push_back(p_);
        }
        return trajRaw_;
    }

    /**
     * @brief 查找最近点ID. 比较曲线中每个点和当前点的距离
     *
     * @param state 车辆状态
     * @param traj 待跟踪轨迹
     * @return int nID: nearset ID 最近点ID
     */
    int getNearestIndex(State state, const Traj &traj)
    {
        // 首先将变量 nID 的值初始化为 -1，将变量 mind 的值初始化为一个极大值
        int nID = -1;
        float mind = std::numeric_limits<double>::max();
        for (unsigned int i = 0; i < traj.size(); i++)
        {
            float idx = traj[i].x - state.x;
            float idy = traj[i].y - state.y;
            float d_e = idx * idx + idy * idy;

            if (d_e < mind)
            {
                mind = d_e;
                nID = i;
            }
        }
        return nID;
    }

    Controller::Controller(std::string configFile)
    {

        this->configFile = configFile;

        // config yaml 配置加载
        YAML::Node config = YAML::LoadFile(configFile);
        maxSpeed = config["maxSpeed"].as<double>();
        maxSteer = config["maxSteer"].as<double>() / 180.f * M_PI;
        double ratioWheelToSteer =
            config["ratioWheelToSteer"].as<double>();
        dt = config["dt"].as<double>();
        maxDistanceFromTraj =
            config["maxDistanceFromTraj"].as<double>();
        controlMethod = config["controlMethod"].as<std::string>();
        useGaussianCoordinateSystem =
            config["useGaussianCoordinateSystem"].as<bool>();
        useInterpolation = config["useInterpolation"].as<bool>();

        double wheelbase = config["wheelbase"].as<double>();
        if (controlMethod == "PID")
        {
            ptrLatController = new PIDController(configFile, maxSteer, ratioWheelToSteer, dt);
        }
        // else if (controlMethod == "LQR")
        // {
        //     ptrLatController = new LQRController(wheelbase, maxSteer, ratioWheelToSteer, dt);
        // }
        // else if (controlMethod == "MPC")
        // {
        //     ptrLatController = new MPCController(configFile, maxSteer, ratioWheelToSteer, dt);
        // }
        else
        {
            // 方法尚未实现，默认加载PID
            std::cout << "\033[0;31mERROR! Method not supported yet\033[0m" << std::endl;
            ptrLatController = new PIDController(configFile, maxSteer, ratioWheelToSteer, dt);
        };

        lonController = LonController(maxSpeed);

        nearestID = -1;
    };

    // 实现了Controller类的赋值运算符重载
    Controller &Controller::operator=(const Controller &controller)
    {
        this->configFile = controller.configFile;
        this->maxSpeed = controller.maxSpeed;
        this->maxSteer = controller.maxSteer;
        this->dt = controller.dt;
        this->controlMethod = controller.controlMethod;
        this->nearestID = controller.nearestID;
        this->maxDistanceFromTraj = controller.maxDistanceFromTraj;
        this->lonController = LonController(this->maxSpeed);

        YAML::Node config = YAML::LoadFile(configFile);
        double wheelbase = config["wheelbase"].as<double>();
        double ratioWheelToSteer =
            config["ratioWheelToSteer"].as<double>();

        if (controlMethod == "PID")
        {
            ptrLatController = new PIDController(configFile, maxSteer, ratioWheelToSteer, dt);
        }
        // else if (controlMethod == "LQR")
        // {
        //     ptrLatController = new LQRController(wheelbase, maxSteer, ratioWheelToSteer, dt);
        // }
        // else if(controlMethod == "MPC"){
        //  ptrLatController = new MPCController(configFile,  maxSteer, ratioWheelToSteer, dt);
        // }
        else
        {
            // 方法尚未实现，默认加载PID
            std::cout << "\033[0;31mERROR! Method not supported yet\033[0m" << std::endl;
            ptrLatController = new PIDController(configFile, maxSteer, ratioWheelToSteer, dt);
        };

        return *this;
    };

    /**
     * @brief 接口：生成控制指令
     *
     * @param s 车辆当前状态
     * @param Traj 决策输出【详细】轨迹
     * @return ControlCMD 控制指令
     */
    ControlCMD Controller::calcControlCMD(State s, const Traj &trajRaw)
    {
        ControlCMD cmd{0, 0};
        try
        {
            // std::cout << "Entering calculate CMD" << std::endl;

            // 对GNSS状态进行检查，如果状态不稳定则抛出一个异常，并打印一个警告。如果状态稳定，它将打印当前的GNSS状态
            //  GNSS state check
            if (abs(s.rtkMode - 4) > 0.1 && abs(s.rtkMode - 5) > 0.1 && abs(s.rtkMode - 6) > 0.1)
            {
                std::cout << BOLDRED << "Warning:  GNSS is not stable\n"
                          << RESET;
                throw std::invalid_argument("GNSS is not stable");
            }
            std::cout << BOLDGREEN << " GNSS status=s.rtkMode: " << s.rtkMode
                      << RESET << std::endl;

            State s_ = s;
            Traj traj = trajRaw;

            // 如果使用高斯坐标系，则将轨迹对象转换为右手坐标系
            //  坐标转化
            if (useGaussianCoordinateSystem)
            {
                traj = transferGauss2RightHand(s, traj, s_);
                std::cout << "Using transfer already\n";
            }
            // 如果使用插值，则进行插值拟合以计算角度曲率
            if (useInterpolation)
            {
                auto start3 = std::chrono::steady_clock::now();

                traj = calcSplineWithVCourse(traj); // 插值拟合
                auto end = std::chrono::steady_clock::now();
                auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start3);

                std::cout << YELLOW << "calcSplineWithVCourse delay: "
                          << duration.count() << RESET << std::endl;
            }

            // for(int i=0;i<traj.size();i++)
            // {
            //    // std::cout<<traj[i].x<<',';
            // }
            // std::cout<<std::endl;

            nearestID = getNearestIndex(s_, traj); // 查找最近点

            // 查找最近的轨迹点，并计算当前状态与最近点的距离。如果距离太远，则抛出异常，并打印一个错误消息。
            double distance2TrajRaw = get2Dis(traj[nearestID].x, s_.x, traj[nearestID].y, s_.y);
            printf("\033[33m Vehicle Current State Before Translate: %.2f, %.2f, yaw(rad): %.2f, yaw(deg): %.2f \n", s.x, s.y, s.yaw, s.yaw / M_PI * 180);
            printf(" Vehicle Current State After Translate: %.2f, %.2f, yaw(rad): %.2f, yaw(deg): %.2f \n", s_.x, s_.y, s_.yaw, s_.yaw / M_PI * 180);
            printf("\n");
            printf(" NearestPoint: ID:%d, x:%.2f, y:%.2f, v: %.2f \n", nearestID, traj[nearestID].x, traj[nearestID].y, traj[nearestID].v);
            printf(" vehicle Current State to NearestPoint distance: %.2f \n\033[0m", distance2TrajRaw);

            // 规划轨迹不能离当前自车状态太远，否则是规划或者定位问题
            if (distance2TrajRaw > maxDistanceFromTraj)
            {
                std::cout << BOLDRED << "ERROR! Traj's NearestPoint distance too far way from vehicle Current State! "
                          << "\n"
                          << "vehicle Current State to NearestPoint distance:"
                          << distance2TrajRaw << RESET << std::endl;
                throw std::invalid_argument("Traj's NearestPoint distance too far way from vehicle Current State");
            }

            // 计算当前速度
            cmd.speed = lonController.calcSpeed(s_, traj, nearestID);
            // 计算前轮转角
            //ccy
            // cmd.steer = ptrLatController->calcSteer(s_, traj, nearestID);
            cmd.obsDis = traj[nearestID].obsDIS;

            std::cout << BOLDBLUE;
            std::cout << " Speed: " << cmd.speed <<" (m/s)"<<"\t"<<cmd.speed*3.6<<" (km/h)"<< std::endl;
            std::cout << " Steer(deg):" << cmd.steer / M_PI * 180 * 22.0 << std::endl;
            std::cout << RESET;
        }
        catch (std::exception &e)
        {
            std::cerr << BOLDRED << "Error capture! Stop vehicle." << RESET << std::endl;
            ControlCMD cmd{0, 0};
            return cmd;
        }
        return cmd;
    }

    /**
     * @brief 纵向控制器 根据轨迹最近点分配速度
     *
     * @param s 车辆当前状态
     * @param traj 待跟踪轨迹
     * @param nearestID traj中最近点ID
     * @return double 期望速度
     */
    double LonController::calcSpeed(State s, const Traj &traj, size_t nearestID)
    {
        if (nearestID < 0)
        {
            throw std::invalid_argument("longitude control input error nearestID");
        }

        // size_t controlID = 0;
        // if (nearestID < traj.size() - 10)
        // {
        //     controlID = nearestID + 10;
        // }
        // double desiredV = traj[controlID].v;
        // if (desiredV > 0.1 && desiredV < 1.0)
        // {
        //     desiredV = 1.0;
        // }

        // double tReplan = 0.1;
        // double sPreview = tReplan * s.v;
        double sPreview = 1;
        // std::cout<<"tReplan"<<tReplan<<"s.v"<<s.v<<std::endl;
        size_t controlID = 1;
        std::cout << "************* " << std::endl;
        for (int i = 0; i <= traj.size(); i++)
        {
            // std::cout << "************* " << std::endl;
            // printf("######\n");
            if (traj[i].s >= sPreview)
            {
                printf("@@@@traj[i].s=%.2f\t", traj[i].s);
                break;
            }
            controlID += 1;
        }

        // 打印轨迹上轨迹点的累积S，与期望速度
        std::cout << BOLDCYAN;
        std::cout << "traj s: ";
        for (auto &i : traj)
            printf("%.2f\t", i.s);
        printf("\n");

        printf("\n");
        std::cout << "traj v: ";
        for (auto &i : traj)
            printf("%.2f\t", i.v);

        printf("\n");
                for (auto &i : traj)
            printf("%.2f\t", i.x);
        printf("\n");

        printf("\n");
                for (auto &i : traj)
            printf("%.2f\t", i.y);
        printf("\n");

        // std::cout << "************* " << std::endl;
        printf("controlID: %zu, s: %.2f, v: %.2f\n", controlID, traj[controlID].s, traj[controlID].v);
        std::cout << RESET;

        // double speedoutput=regulateOutput(traj[controlID].v);

        // printf("@@@@@@@----======obsDIS: %.3f\n", traj[controlID].obsDIS);
        double speedoutput = traj[controlID].v; // m/s
        speedoutput = (int)(speedoutput * 10);
        speedoutput /= 10.0;
        // double speedoutput = 25/3.6;

        // //设置速度下限
        // if(speedoutput<2.1/3.6  &&  speedoutput>0.01)
        // {
        //     //speedoutput=2.1/3.6;
        // }

        //@@@0527 传过来的速度作暂时停车判断
        // if (speedoutput == 0)
        // {
        //     speedZeroFlag = 0;
        // }
        // if (speedoutput != 0 && speedZeroFlag < 25)
        // {
        //     speedoutput = 0;
        //     speedZeroFlag++;
        // }

        return speedoutput;
    };

} // namespace Control
