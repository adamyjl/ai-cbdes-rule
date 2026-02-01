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

#include "funcPidController.hpp"

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
PID::PID(double kp, double ki, double kd, double dt, bool isThreshOn, double errorThresh, double dThresh, bool isdThreshOn, double = 1)
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
    
    // 0201
    // ccy
    // ConfigParamStruct configParam;
    // ConfigInputStruct configInput;
    // ConfigOutputStruct configOutput;
    // configParam.config = config;
    // configInput.dt = dt;
    // configInput.name = "anglePVecPID";
    // pidLoadPIDYamlConfig(configParam,configInput,configOutput);
    // PID anglePVecPID = configOutput.pid;

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

    if(anglePVecError < - M_PI){
        anglePVecError += 2.0*M_PI;
    }
    else if(anglePVecError > M_PI){
        anglePVecError -= 2.0*M_PI;
    }

    YawError = anglePVecError;

    std::cout <<RED<< "\tstate.yaw(rad): " << state.yaw <<" \tangle(previewID to vehicle state(rad)): " << atan2(traj[previewID].y - state.y, traj[previewID].x - state.x)
                <<"\n"<< "\tYawAnglePVecError: " << anglePVecError  << RESET<<std::endl;

    // 0203
    UpdateParamStruct updateParamStruct3{pidLibs["anglePVecPID"]};
    UpdateInputStruct updateInputStruct3;
    UpdateOutputStruct updateOutputStruct3;
    updateInputStruct3.errorInput = anglePVecError;
    pidControllerUpdate(updateParamStruct3, updateInputStruct3, updateOutputStruct3);

    // 0203
    // ModifyGainsParamStruct modifyParamStruct{pidLibs["anglePVecPID"]};
    // ModifyGainsInputStruct modifyInputStruct;
    // modifyInputStruct.newKp = 53;
    // modifyInputStruct.newKi = 55;
    // modifyInputStruct.newKd = 57;
    // ModifyGainsOutputStruct modifyOutputStruct;
    // pidControllerModifyGains(modifyParamStruct, modifyInputStruct, modifyOutputStruct);
    
    // ResetIParamStruct resetParamStruct{pidLibs["anglePVecPID"]};
    // ResetIInputStruct resetInputStruct;
    // ResetIOutputStruct resetOutputStruct;
    // pidControllerResetI(resetParamStruct, resetInputStruct, resetOutputStruct);

    // pidLibs["anglePVecPID"].update(anglePVecError);
    

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
}


/**
 * @brief 计算预瞄距离。根据最近点的状态(速度，曲率)，调整预瞄距离
 *
 * @param state 车辆状态
 * @param traj 待跟踪轨迹
 * @param nearestID 当前点ID
 * @return double previewDistance 预瞄距离
 */
double PIDController::calcPreviewDis(State state, const Traj &traj, size_t nearestID)
{
    
    double previewDistance = 0;
    double kCur = 1;

    ////首先获取最近点的速度和曲率
    double velocity = traj[nearestID].v;
    double curvature = traj[lastpreviewID].k;

    //如果当前点是轨迹中的最后一个点，最近预瞄点的曲率取倒数第二个点的曲率(最后一个点没有曲率，三点确定圆的曲率)
    if(lastpreviewID==traj.size()-1)
    {
        curvature=traj[lastpreviewID-1].k;
    }

    //lastPreviewDistance是从配置文件中加载的初始预瞄距离

    //计算速度4和曲率的加权系数
    double speedFactor=previewKV * velocity;
    if(speedFactor>5) speedFactor=5;
    // if(plusPreviewPoint)
    // {
    //     int plusPreviewPointID=plusPreviewPointweight*(lastpreviewID-nearestID)+nearestID;
    //     double plusCurvature=traj[plusPreviewPointID].k;
    //     if(plusCurvature>curvature)
    //         curvature=plusCurvature;
    // }
    double curvatureFactor=curvature * previewExpKC;
    if(curvature<previewExpThre)
        curvatureFactor=0;

    previewDistance = speedFactor - curvatureFactor + lastPreviewDistance;

    // 限制预瞄距离变化过快
    // if (lastPreviewDistance > 0) //非第一次进入
    // {
    //     if (previewDistance - lastPreviewDistance > maxPreviewDistancePlusDelta)
    //     {
    //         previewDistance = lastPreviewDistance + maxPreviewDistancePlusDelta;
    //     }
    //     else if (lastPreviewDistance - previewDistance > maxPreviewDistanceMinusDelta)
    //     {
    //         previewDistance = lastPreviewDistance - maxPreviewDistanceMinusDelta;
    //     }

    //     if (previewDistance < 0.1)
    //     {
    //         previewDistance = 0.1;
    //     }
    // }
    
    // 限制最大、最小预瞄距离
    if (previewDistance > maxPreviewDistance)
        previewDistance = maxPreviewDistance;
    else if (previewDistance < minPreviewDistance)
        previewDistance = minPreviewDistance;

    lastPreviewDistance=previewDistance;

    std::cout << "lastpreviewID: " << lastpreviewID
        << "\tpreviewDistance: " << previewDistance
        << "\tv_factor: " << speedFactor
        << "\tvelocity= " << velocity
        << "\tcur_factor: " << curvatureFactor
        << "\tcurvature= " << curvature << std::endl;
    
    return previewDistance;

}

/**
 * @brief 寻找预瞄点，根据路程大小，比较两个路点的先后。用于后面的getPreviewID中
 *
 * @param p1 路点1
 * @param p2 路点2
 * @return true 路点1在前
 * @return false 路点2在前
 */
bool compareTrajDistance(const TrajPoint &p1, const TrajPoint &p2) { return p1.s < p2.s; }

/**
 * @brief 跟据预瞄距离查找预瞄点，最近点往前走previewDistance长的路程
 *
 * @param previewDistance 预瞄距离
 * @param traj 待跟踪轨迹
 * @param nID 当前点ID
 * @return int pID:  preview point ID. 预瞄点ID
 */
int PIDController::getPreviewID(double previewDistance, const Traj &traj, size_t nID)
{
    //传入一个预瞄距离和轨迹，函数会找到距离当前点最近且距离当前点预瞄距离的路点，并返回其ID

    //定义一个路点(pointPreview)表示预瞄点，这个点的s属性等于当前点到预瞄点的距离加上当前点的s属性，即最近点往前预瞄
    TrajPoint pointPreview{0, 0, 0, 0, 0, previewDistance + traj[nID].s}; 

    //通过lower_bound二分法在从当前点开始到轨迹末尾的路点中寻找第一个大于等于pointPreview的路点，并返回其ID
    auto low = std::lower_bound(traj.begin() + nID, traj.end(), pointPreview, compareTrajDistance);

    int previewID = low - traj.begin();
    //如果寻找到了轨迹末尾仍没有找到满足要求的路点，函数会返回轨迹末尾的路点ID，同时输出"End of preview"，表示已经到达轨迹末尾
    if (previewID >= traj.size()) // vector可能会越界
    {
        previewID = traj.size() - 1;
        std::cout << "End of preview" << std::endl;
    }
    return previewID;
}


/**
 * @brief 根据纯追踪，计算前轮转角，为前馈。详细推导见doc
 *
 * @param state 车辆状态
 * @param traj 待跟踪轨迹
 * @param nID 当前点ID
 * @param pID 预瞄点ID
 * @return double delta:  前轮转角
 */
// double PIDController::calcFeedForwardAngle(State state, const Traj &traj, int nID, int pID)
// {
//     //通过预瞄点和车辆位置之间的角度差来计算alpha，再通过预瞄点和车辆位置之间的距离Ld，结合车辆轴距(wheelbase)计算前轮转角delta
//     double alpha = state.yaw - atan2(traj[pID].y - state.y, traj[pID].x - state.x);
//     double Ld = get2Dis(traj[pID].x, state.x, traj[pID].y, state.y); // 预瞄点和自车距离
//     double delta = atan2(2.0 * wheelbase * sin(alpha) / Ld, 1.0);
    
//     printf("feedforward detail:\n aphla(rad) %.0f lf %.2f delta(rad) %.0f\n",  
//             alpha * 180 / M_PI, Ld, delta / M_PI * 180);

//     return delta;
// }

/**
 * @brief   根据误差值，计算反馈控制量
 *
 * @param 私有变量 pidLibs
 * @return double fb:  feedback 反馈前轮转角
 */
double PIDController::calcFeedback()
{
    //遍历私有变量pidLibs中的所有PID控制器，对每一个控制器都计算出它的输出并加到feedback中，最后返回总的反馈前轮转角
    double feedback = 0;
    // std::cout<<"PID Feedback:";
    for (auto const &x : pidLibs)
    {
        PID pid = x.second; // pidLibs 的first是key, second是控制器
        std::cout<<x.first<<','<<pid.output()<<',';
        feedback += pid.output();
    }
    // std::cout << "-------@ @ @--------" << std::endl;
    std::cout<<"PID.CalcOutput(only YawAnglePVecPID):"<<feedback<<std::endl;
    return feedback;
}



/**
 * @brief 计算前轮转角
 *
 * @param s 车辆状态
 * @param traj 待跟踪轨迹
 * @return double steer:  前馈+反馈前轮转角
 */
double PIDController::calcSteer(State s, const Traj &traj, size_t nearestID)
{
    //函数首先将最近的点的索引赋给lastpreviewID变量
    if(lastpreviewID==0) {
        lastpreviewID = nearestID;
    }
    //使用calcPreviewDis函数计算车辆需要预瞄的距离previewDistance，然后使用getPreviewID函数找到距离该预瞄距离最近的轨迹点的索引previewID
    //std::cout<<"got vehicle state:"<<s.yaw<<std::endl;
    double previewDistance = calcPreviewDis(s, traj, nearestID);
    if(previewDistance>=0&&previewDistance<100)
        std::cout<<"previewDistance OK: "<<previewDistance<<std::endl;
    else
        previewDistance=12;
    // std::cout<<"nearestID: "<<nearestID<<std::endl;
    int previewID = getPreviewID(previewDistance, traj, nearestID);
    lastpreviewID=previewID;

    std::cout << " @@@ control test   "<<"  "<<"  " <<nearestID <<"  "<< previewDistance <<"  "<<previewID<<std::endl;

   
    double previewDistanceReal = get2Dis(traj[previewID].x, s.x, traj[previewID].y, s.y);
    //实际预瞄距离太近，说明剩余可行驶轨迹太短，直接抛出错误
    // if (previewDistanceReal<previewDistance/2 || previewDistanceReal < wheelbase/2){
    //     std::cout<< BOLDRED << "ERROR! Preivew Distance too short! Distance:" 
    //         << previewDistanceReal << ". ID: "<< previewID<< RESET << std::endl;
    //     throw std::invalid_argument("Preivew Distance too short!");
    // }

    if(previewDistanceReal < minPreviewDistance) previewDistanceReal = minPreviewDistance;
    if(previewDistanceReal > maxPreviewDistance) previewDistanceReal = maxPreviewDistance;


    //函数调用calcErrors函数计算误差，这些误差存储在私有变量pidLibs中
    calcErrors(s, traj, nearestID, previewID); 

    // double feedforward = calcFeedForwardAngle(s, traj, nearestID, previewID);
    double feedback = calcFeedback();
    feedback = YawError * steerGain;
    //if(feedback>abs( feedforwardWeight * feedforward)/2)
     //   feedback=abs( feedforwardWeight * feedforward)/2;
    //if(feedback<-abs(feedforwardWeight * feedforward)/2)
     //   feedback=-abs(feedforwardWeight * feedforward)/2;
    // double frontWheelAngle = feedforwardWeight * feedforward + feedback;
    double frontWheelAngle = feedback;
    
    double steer = regulateOutput(frontWheelAngle) * ratioWheelToSteer;

    std::cout << BOLDGREEN;
    std::cout << "ControlDebugInfo PID:" << std::endl;
    std::cout << "\t preview distance: " << previewDistance << std::endl;
    std::cout << "\t Real preview distance: " << previewDistanceReal << std::endl;
    printf("\t previewPoint: %.2f, %.2f, v: %.2f, ; ID: %d\n", traj[previewID].x, traj[previewID].y, traj[previewID].v, previewID);
    // std::cout << "\t feedforward: " << (feedforward * feedforwardWeight) * 180 / M_PI << std::endl;
    // std::cout << "\t feedback: " << (feedback)*180 / M_PI << std::endl;
    std::cout << RESET;

    return steer;
}
} // namespace Control
