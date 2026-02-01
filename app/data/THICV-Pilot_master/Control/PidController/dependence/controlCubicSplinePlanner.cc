/**
 * @file controlCubicSplinePlanner.cc
 * @author yibin, yining (852488062@qq.com)
 * @brief 处理决策输入的原始轨迹(Traj: x y yaw)，输出插值并具有详细信息的轨迹(Traj: xy yaw v k s).
 *
 * @ref name "Cpp Robotics"
 * @version 1.0
 * @date 2022-08-16
 *
 * @copyright Copyright (c) 2022
 *
 */

#include "controlCubicSpline.h"
#include <Eigen/Eigen>
#include <array>
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace Control
{

Vec_d vecDiff(Vec_d input)
{
    Vec_d output;
    for (unsigned int i = 1; i < input.size(); i++)
    {
        output.push_back(input[i] - input[i - 1]);
    }
    return output;
};

Vec_d cumSum(Vec_d input)
{
    Vec_d output;
    double temp = 0;
    for (unsigned int i = 0; i < input.size(); i++)
    {
        temp += input[i];
        output.push_back(temp);
    }
    return output;
};

/**
 * @brief 样条曲线插值轨迹，并计算相应的切向角度和曲率
 *
 * @param x 原始轨迹点
 * @param y
 * @param rX
 * @param rY
 * @param rYaw
 * @param rCurvature
 * @param rS
 * @param ds
 */
void calcSplineCourse(Vec_d x, Vec_d y, Vec_d &rX, Vec_d &rY, Vec_d &rYaw, Vec_d &rCurvature, Vec_d &rS, double ds)
{
    Spline2D csp_obj(x, y);
    for (double i = 0; i < csp_obj.s.back(); i += ds)
    {
        std::array<double, 2> point_ = csp_obj.calcPosition(i);
        rX.push_back(point_[0]);
        rY.push_back(point_[1]);
        rYaw.push_back(csp_obj.calcYaw(i));
        rCurvature.push_back(csp_obj.calcCurvature(i));
        rS.push_back(i);
    }
}

// remove the duplicate points. 删除轨迹重复点
Traj removeDuplicate(const Traj &trajRaw)
{
    Traj trajRawRemoveDup;
    Vec_d x, y, v;
    double x0, y0, d;
    x0 = trajRaw[0].x;
    y0 = trajRaw[0].y;
    TrajPoint point{trajRaw[0].x, trajRaw[0].y, 0, trajRaw[0].v, 0,0};
    // std::cout <<"point init" << point.x<<std::endl;
    trajRawRemoveDup.push_back(point);

    for (const auto &tpRaw : trajRaw)
    {
        d = (x0 - tpRaw.x) * (x0 - tpRaw.x) + (y0 - tpRaw.y) * (y0 - tpRaw.y);
        if (d < 1e-4)
        {
            continue;
        }
        x0 = tpRaw.x;
        y0 = tpRaw.y;

        TrajPoint point{tpRaw.x, tpRaw.y, 0, tpRaw.v, 0,0};
        trajRawRemoveDup.push_back(point);
    }

    return trajRawRemoveDup;
}

/**
 * @brief 处理决策输入的原始轨迹(Traj: x y yaw)，输出插值并具有详细信息的轨迹(Traj: xy yaw v k s).
 *
 * @param trajRaw 原始轨迹
 * @param ds 采样间隔
 * @return Traj 输出轨迹
 */
Traj calcSplineWithVCourse(const Traj &trajRaw, double ds)
{
    std::cout << " trajRaw size " << trajRaw.size() << std::endl;

    Traj trajRawRemoveDup = removeDuplicate(trajRaw);
    std::cout << " trajRawRemoveDup done " << std::endl;

    if (trajRawRemoveDup.size() < 2)
    {
        std::cout << "\033[1m\033[31mERROR: Decision trajectory too short\033[0m" << std::endl;
        throw std::invalid_argument("decision trajectory size < 2");
    }
    Vec_d x, y, v;
    for (const auto &tpRaw : trajRawRemoveDup)
    {
        x.push_back(tpRaw.x);
        y.push_back(tpRaw.y);
        v.push_back(tpRaw.v);
    }

    Traj traj;
    Spline2DWithV csp_obj(x, y, v);
    for (double i = 0; i < csp_obj.s.back(); i += ds)
    {
        std::array<double, 2> point_ = csp_obj.calcPosition(i);

        double rX = (point_[0]);
        double rY = (point_[1]);
        double rV = (csp_obj.calcV(i));
        double rYaw = (csp_obj.calcYaw(i));
        double rCurvature = (csp_obj.calcCurvature(i));
        double rS = (i);
        TrajPoint point{rX, rY, rYaw, rV, rCurvature, rS};
        traj.push_back(point);
    }
    return traj;
}

} // namespace Control
