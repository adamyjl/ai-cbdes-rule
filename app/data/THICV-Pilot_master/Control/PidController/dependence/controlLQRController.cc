/**
 * @file controlLQRController.cc
 * @author yibin, yining (852488062@qq.com)
 * @brief LQR横向控制器
 * @version 1.0
 * @date 2022-08-16
 * 
 * @copyright Copyright (c) 2022
 * 
 */
#include "controlLQRController.hpp"
#include <math.h>
#include <iostream>
#include "controlCubicSpline.h"
#include "qingColor.h"

namespace Control{

/**
 * @brief solve a discrete time_Algebraic Riccati equation (DARE)
 * 用迭代法求解离散时间黎卡提方程。
 */
Mat LQR::solveDARE(Mat A, Mat B, Mat Q, Mat R){
    Mat P =Q;
    int maxIter = 150;
    double eps = 0.01;
    for(int i=0;i<maxIter;i++){
        Mat AT = A.transpose();
        Mat BT = B.transpose();
        Mat Xn = AT*P*AT- AT*P*B*(R+BT*P*B).inverse()*BT*P*A+Q;

        if ((Xn-P).cwiseAbs().maxCoeff()<eps){
            break;
        }
        P = Xn;
    }
    return P;
}

/**
 * @brief Solve the discrete time lqr controller.
 * 求解离散时间LQR控制率 K. ref Bertsekas, p.151
 */
Mat LQR::dLQR(Mat A, Mat B, Mat Q, Mat R){

    Mat P = solveDARE(A, B, Q, R);

    Mat AT = A.transpose();
    Mat BT = B.transpose();

    Mat K = ((BT*P*B+R).inverse()) * (BT *P * A);

    return K;
}

/**
 * @brief 求解横向控制量
 * 
 * @param s 
 * @param traj 
 * @param nearestID 
 * @return double 
 */
double LQRController::calcSteer(State s, const Traj& traj, size_t nearestID){
    
    // tracking error
    double e = get2Dis(traj[nearestID].x, s.x, traj[nearestID].y, s.y);

    double dxl = traj[nearestID].x - s.x;
    double dyl = traj[nearestID].y - s.y;
    double angle = normalizeRad(traj[nearestID].yaw - std::atan2(dyl, dxl));
    if (angle > M_PI)
        e = e * -1;

    double th_e = s.yaw - traj[nearestID].yaw;
    float curvature = traj[nearestID].k;

    double v = s.v;
    Mat A(4,4);
    A<< 1,dt,0,0,  
            0,0,v,0,
            0,0,1,dt, 
            0,0,0,0;
    Mat B(4,1);
    B(3) = v/L;

    Mat Q(4,4);
    Q.setIdentity();
    Mat R(1,1);
    R<<1;

    LQR lqr;
    Mat K = lqr.dLQR(A, B, Q, R);

    Eigen::Vector4d x(4,1);
    x<< e, e/dt, th_e, th_e/dt;

    // TODO 曲率加正负

    double ff = std::atan2(L*curvature, (double)1.0); //feedforward
    double fb = normalizeRad(-(K*x).coeff(0));  // feedback

    double delta = ff+fb;

    delta = regulateOutput(delta* ratioWheelToSteer);

    std::cout << BOLDGREEN;
    std::cout << "ControlDebugInfo MPC:" << std::endl;
    printf("       feedforward: curvature %.2f, steer forward %.2f\n",
        curvature, ff * 180.0 / M_PI);
    printf("       feedback: steer feedback %.2f\n", fb * 180.0 / M_PI);    

    std::cout << RESET;

    return delta;
}

}

