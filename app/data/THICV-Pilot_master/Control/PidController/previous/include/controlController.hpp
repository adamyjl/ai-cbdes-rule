/**
 * @file controlController.hpp
 * @author yibin, yining (852488062@qq.com)
 * @brief 总控制器模块，横向控制基类，纵向控制类定义
 * @version 1.0
 * @date 2022-08-18
 *
 * @copyright Copyright (c) 2022
 *
 */
#ifndef _CONTORL_COMMON_H
#define _CONTORL_COMMON_H
#include <cmath>
#include <vector>
#include <iostream>
#include "controlData.hpp"
#include <cassert>

namespace Control
{
    Traj transferGauss2RightHand(const State &s, const Traj &trajRaw, State &s_);
    int getNearestIndex(State state, const Traj &traj);
    
    /**
     * @example controlMain4ros.cc  controlMain4ros.hpp ROS调用示例
     * @example controlMain.cc 几种类的构造调用方法
     *
     */

    /**
     * @brief 横向控制器基类。
     * @note 抽象类，子类控制器必须实现 `calcSteer`计算前轮转角方法
     *
     */
    class LatControllerBase
    {
    public:
        LatControllerBase(double maxSteer, double ratioWheelToSteer = 20, double dt = 0.1)
        {
            this->maxSteer = maxSteer;
            this->dt = dt; // 控制器采样频率
            this->ratioWheelToSteer = ratioWheelToSteer;
        };
        ~LatControllerBase(){};
        //
        // virtual double calcSteer(State s, const Traj &traj, size_t nearestID) = 0;

    protected:
        double regulateOutput(double steer)
        {
            // // 考虑转向角物理限制
            // if (steer  > maxSteer * M_PI /180.0 )
            //     steer = maxSteer  * M_PI /180.0;
            // else if (steer < -maxSteer * M_PI /180.0)
            //     steer = -maxSteer * M_PI /180.0;
            return steer;
        }

        double dt; // motion update frequency.
        double maxSteer;
        double ratioWheelToSteer;
    };

    /**
     * @brief longitude 纵向控制器
     *
     */
    class LonController
    {
    public:
        LonController(double maxSpeed)
        {
            this->maxSpeed = maxSpeed; // 最大速度
        };
        LonController(){};
        ~LonController(){};

        double calcSpeed(State s, const Traj &traj, size_t nearestID);

    protected:
        double regulateOutput(double speed)
        {
            if (speed > maxSpeed)
            {
                std::cout << "\033[0;33mWarning! Max speed upflow. Max speed:" << maxSpeed << "traj speed:" << speed << "\033[0m" << std::endl;
                speed = maxSpeed;
            }
            // else if (speed < -maxSpeed)
            // {
            //     std::cout << "\033[0;33mWarning! Max speed downflow. Max speed:" << maxSpeed << "traj speed:" << speed << "\033[0m" << std::endl;
            //     speed = -maxSpeed;
            // }

            return speed;
        }
        double maxSpeed;
    };

    //  dgh* @example controlMain.cc 输入轨迹和自车状态，输出控制量
    //  @example controlMain4ros.cc ROS调用示例

    /**
     * @brief 横纵向控制器基类
     * 控制模块为该主要模块。内部分为横向控制和纵向控制
     *

     */
    class Controller
    {
    public:
        // 指向横向控制器的指针
        LatControllerBase *ptrLatController;
        // 纵向控制器对象
        LonController lonController;

        Controller(std::string configFile);
        Controller(){};
        ~Controller()
        {
            delete ptrLatController;
        };
        Controller &operator=(const Controller &controller);

        // 计算控制命令
        ControlCMD calcControlCMD(State s, const Traj &trajRaw);

        // 进行控制器模块的自检
        bool moduleSelfCheck(double steer, double speed)
        {
            bool isLegal = true;
            if (steer >= maxSteer || steer <= -maxSteer)
            {
                isLegal = false;
                std::cout << "illegal steer" << std::endl;
            }
            if (speed >= maxSpeed || speed <= 0)
            {
                isLegal = false;
                std::cout << "illegal speed" << std::endl;
            }
            return isLegal;
        }
        void moduleSelfCheckPrint(double steer, double speed)
        {
            std::cout << "self check print: steer: " << steer << std::endl;
            std::cout << "self check print: speed: " << speed << std::endl;
        }

    private:
        int nearestID; // 轨迹最近点ID
        double dt;     // motion update frequency.
        double maxSteer, maxSpeed;
        std::string controlMethod;        // 使用的控制方法
        std::string configFile;           // 配置文件路径
        double maxDistanceFromTraj;       // 允许的轨迹和车辆的最大距离
        bool useGaussianCoordinateSystem; // 是否使用高斯坐标系
        bool useInterpolation;            //  是否使用曲线插值
    };

    int getNearestIndex(State state, const Traj &traj);

    /**
     * @brief 弧度归一化到[0, 2*PI)
     *将弧度值t归一化到[-π, π]之间的范围内。如果t小于0，则将其转换为大于0的值，并将其减去2π的倍数，以确保其在[0,2π]范围内。
     最后，返回t减去2π的倍数后的值，以确保其在[-π,π]范围内。
     * @param t 待归一化值
     * @return double 归一化结果
     */
    static inline double normalizeRad(double t)
    {
        if (t < 0)
        {
            t = t - 2.f * M_PI * (int)(t / (2.f * M_PI));
            return 2.f * M_PI + t;
        }
        return t - 2.f * M_PI * (int)(t / (2.f * M_PI));
    };

    // 两点间欧式距离
    static inline double get2Dis(double x1, double x2, double y1, double y2)
    {
        return sqrt(pow((x1 - x2), 2) + pow((y1 - y2), 2));
    }

}

#endif