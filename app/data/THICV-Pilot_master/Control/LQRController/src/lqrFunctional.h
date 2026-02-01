/**
 * @brief LQR头文件
 * @file lqrFunctional.h
 * @version 0.0.1
 * @author Zihan Xie (770178863@qq.com)
 * @date 2023-12-19
 */
#include "controlLQRController.hpp"
using namespace std;
using namespace Control;

struct lqrPara
{
    LQRController controller;
    lqrPara(double wb,double mS,double rWTS,double Dt)
    :controller(wb,mS,rWTS,Dt){}
    lqrPara(double wb,double mS,double rWTS)
    :controller(wb,mS,rWTS){}
};

struct lqrInput
{
    State s;
    Traj traj;
    size_t nearestID;
};


struct lqrOutput{double delta;};

struct solveDAREPara{};

struct solveDAREInput
{
    Mat A;
    Mat B;
    Mat Q;
    Mat R;
};

struct solveDAREOutput{Mat P;};

struct dLQRPara{};

struct dLQRInput
{
    Mat A;
    Mat B;
    Mat Q;
    Mat R;
};

struct dLQROutput{Mat K;};
        // Mat solveDARE(Mat A, Mat B, Mat Q, Mat R);

        // Mat dLQR(Mat A, Mat B, Mat Q, Mat R);
/**
 * @brief 计算LQR输出
 * @param[IN] lqrPara LQRController对象
 * @param[IN] lqrInput State对象、Traj对象、最近的ID
 * @param[IN] lqrOutput 转向角
 * @cn_name: 计算LQR输出
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void calcLQR(lqrPara &para,const lqrInput &input,lqrOutput &output);
/**
 * @brief LQR求解黎卡提方程
 * @param[IN] solveDAREPara 空、占位
 * @param[IN] solveDAREInput 矩阵A、B、Q、R
 * @param[IN] solveDAREOutput 矩阵P
 * @cn_name: 求解LQR黎卡提方程
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void solveLQRDARE(solveDAREPara &para,solveDAREInput &input,solveDAREOutput &output);
/**
 * @brief LQR求解反馈矩阵K
 * @param[IN] dLQRPara 空、占位
 * @param[IN] dLQRInput 矩阵A、B、Q、R
 * @param[IN] dLQROutput 矩阵K
 * @cn_name: 求解LQR反馈矩阵
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 * @tag: Control
 */
void solveLQRK(dLQRPara &para,dLQRInput &input,dLQROutput &output);
