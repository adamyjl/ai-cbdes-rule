/*
 * @brief 拟人化警报噪声生成函数（非成员函数实现）
 * @en_name generateHumanoidAlertNoise
 * @cn_name 拟人化警报噪声生成
 * @type Function
 * @param velocity 当前速度值，单位：km/h [IN]
 * @retval String 生成的噪声描述字符串
 * @granularity Atomic
 * @tag_level1 control
 * @tag_level2 noise
 * @formula s = s + 1
 * @version 1.0
 * @date 2023-11-15
 * @author zhangsan
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>


// 假设的最大速度上限，用于数组分配
#define MAX_NOISE_COUNT 100

// 速度状态结构体，模拟全局状态管理
// 因禁止全局变量，实际使用时应在调用方维护

/*
 * @brief 停车动作执行函数
 * @en_name executeStopAction
 * @cn_name 执行停车操作
 * @type Function
 * @retval int 执行结果，0表示成功
 * @granularity Atomic
 * @tag_level1 control
 * @tag_level2 stop
 * @version 1.0
 * @date 2023-11-15
 * @author zhangsan
 */
int executeStopAction(void) {
    // 执行停车逻辑，例如发送CAN信号或设置状态位
    int stopResult = 0;
    // 具体的停车实现代码...
    printf("车辆已停止。\n");
    return stopResult;
}

/*
 * @brief 噪声字符串生成器
 * @en_name appendNoiseSignal
 * @cn_name 追加噪声信号
 * @type Function
 * @param baseStr 基础字符串 [IN]
 * @param count 当前噪声次数 [IN]
 * @param resultStr 结果存储缓冲区 [OUT]
 * @retval int 处理结果，0表示成功
 * @granularity Atomic
 * @tag_level1 control
 * @tag_level2 noise
 * @version 1.0
 * @date 2023-11-15
 * @author zhangsan
 */
int appendNoiseSignal(const char* baseStr, int count, char* resultStr) {
    int result = 0;
    sprintf(resultStr, "%s-Beep_%d", baseStr, count);
    return result;
}

/*
 * @brief 拟人化警报噪声生成（一级函数入口）
 * @en_name makeNoise
 * @cn_name 生成警报噪声
 * @type Function
 * @param pVelocity 速度值的指针，单位：km/h [IN/OUT]
 * @retval String 生成的噪声字符串
 * @granularity Composite
 * @tag_level1 control
 * @tag_level2 alert
 * @version 1.0
 * @date 2023-11-15
 * @author zhangsan
 */
char* makeNoise(int* pVelocity) {
    static char noiseBuffer[MAX_NOISE_COUNT]; // 静态缓冲区用于返回字符串
    static int noiseCounter = 0; // 静态变量记录噪声次数
    
    // 变量声明
    int currentVelocity = 0; // 当前速度，单位：km/h
    int stopStatus = 0;      // 停车状态标志
    int appendStatus = 0;    // 字符串追加状态
    
    // 获取当前速度
    currentVelocity = *pVelocity;
    
    // 判断速度是否为0
    if (currentVelocity == 0) {
        // 执行停车操作
        stopStatus = executeStopAction();
        sprintf(noiseBuffer, "Stop_Signal");
        return noiseBuffer;
    }
    
    // 速度减1 (禁止使用 -=，需展开)
    currentVelocity = currentVelocity - 1;
    *pVelocity = currentVelocity;
    
    // 更新计数器 (禁止使用 ++，需展开)
    noiseCounter = noiseCounter + 1;
    
    // 生成噪声字符串
    appendStatus = appendNoiseSignal("Alert", noiseCounter, noiseBuffer);
    
    return noiseBuffer;
}