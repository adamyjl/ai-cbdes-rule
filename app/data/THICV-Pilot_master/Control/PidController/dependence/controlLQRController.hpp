/**
 * @file controlLQRController.hpp
 * @author yibin, yining (852488062@qq.com)
 * @brief LQR横向控制模块定义
 * @version 0.1
 * @date 2022-08-18
 * 
 * @copyright Copyright (c) 2022
 * 
 */
#ifndef _CONTROL_LQR_CONTROLLER_H
#define _CONTROL_LQR_CONTROLLER_H
// #include "controlCubicSpline.h"
#include <Eigen/Dense>
# include "controlController.hpp"


using Mat = Eigen::MatrixXd;
using Vec = Eigen::VectorXd;
using Matrix5d = Eigen::Matrix<double, 5, 5>;
using Matrix52d = Eigen::Matrix<double, 5, 2>;
using Matrix25d = Eigen::Matrix<double, 2, 5>;
using RowVector5d = Eigen::Matrix<double, 1, 5>;
using Vector5d = Eigen::Matrix<double, 5, 1>;

namespace Control{

class LQR
{
public:
    LQR(){};
    ~LQR(){};
    Mat solveDARE(Mat A, Mat B, Mat Q, Mat R);
    Mat dLQR(Mat A, Mat B, Mat Q, Mat R);
};


/**
 * @brief LQR横向控制类
 * 
 */
class LQRController:public LatControllerBase{

    public:
        LQRController(double wheelbase, double maxSteer, double ratioWheelToSteer, double dt=0.1): LatControllerBase(maxSteer, ratioWheelToSteer,dt){
            // Params: 
            //  L: wheelbase.轴距
            this->L = wheelbase;
        };
        ~LQRController(){};
        double calcSteer(State s, const Traj& traj, size_t nearestID);
    private:
        double L;       // vehicle wheelbase

};


}
#endif