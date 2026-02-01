/**
 * @brief 测试用例
 * @file main.cpp
 * @version 0.0.1
 * @author Zehang Zhu (zzh22@tsinghua.edu.com)
 * @date 2023-11-25
 */

#include <iostream>
#include "../include/functionalPid.h"

int main(){
    // PID(double kp, double ki, double kd, double dt, bool isThreshOn, double errorThresh, double dThresh, bool isdThreshOn, double w);
    static PID pidController(2,5,6,7,8,9,10,12,1);
    double error = 5.0;
    double control = 10;

    ParamStruct01 pS01{
        .c = pidController,
    };
    InputStruct01 iS01{
        .errorInput = error,
    };
    OutputStruct01 oS01{
        .controlOutput = control,
    };

    ParamStruct02 pS02{
        .c = pidController,
    };
    InputStruct02 iS02{
        .newKp = 1.0,
        .newKi = 2.0,
        .newKd = 3.0,
    };
    OutputStruct02 oS02{
    };

    ParamStruct03 pS03{
        .c = pidController,
    };
    InputStruct03 iS03{
    };
    OutputStruct03 oS03{
    };



    pidControllerUpdate(pS01, iS01, oS01);
    std::cout << "this is the 1st control output: " << oS01.controlOutput << std::endl;

    pidControllerModifyGains(pS02, iS02, oS02);
    pidControllerUpdate(pS01, iS01, oS01);
    std::cout << "this is the 2nd control output: " << oS01.controlOutput << std::endl;

    pidControllerResetI(pS03, iS03, oS03);
    pidControllerUpdate(pS01, iS01, oS01);
    std::cout << "this is the 3rd control output: " << oS01.controlOutput << std::endl;

    return 0;
}
