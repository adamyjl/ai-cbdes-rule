/**
  @file testStGraphOpt.cpp
  @brief 速度轨迹平滑优化模块单元测试
*/

#include "../inc/stGraphOpt.h"
#include <stdio.h>
#include <stdlib.h>

/**
  @brief 单元测试主函数
  @en_name main
  @cn_name 测试主函数
  @type 复合函数
  @param argc int 参数个数
  @param argv char* 参数列表
  @retval int 返回码
  @granularity 模块
  @tag_level1 test
  @tag_level2 speed
  @version 1.0.0
  @date 2023-10-27
  @author AI-Dev
*/
int main(int argc, char* argv[]) {
    STgraphOptParam param; /**< 优化参数 */
    STgraphOptInput input; /**< 优化输入 */
    STgraphOptOutput output; /**< 优化输出 */
    OptStatus status = OPT_SUCCESS; /**< 状态码 */
    int i = 0; /**< 循环索引 */
    
    /* 准备测试数据 */
    const int dataSize = 10; /**< 数据大小 */
    input.trajectory.size = dataSize;
    input.trajectory.points = (PlanningPoint*)malloc(sizeof(PlanningPoint) * dataSize);
    
    for (i = 0; i < dataSize; i = i + 1) {
        input.trajectory.points[i].t = (double)i * 0.1;
        input.trajectory.points[i].s = (double)i * 1.0;
        input.trajectory.points[i].v = 5.0 + ((i % 3) - 1) * 2.0; /**< 添加噪声 */
        input.trajectory.points[i].a = 0.0;
    }

    /* 配置参数：测试 L2 模式 */
    param.algoType = ALGO_TYPE_L2;
    param.maxIterations = 100;
    param.errorThreshold = 0.001;
    param.weightData = 0.5;
    param.weightSmooth = 0.5;
    param.tolerance = 0.001;

    /* 调用优化函数 */
    status = optimizeVelocityTrajectory(&param, &input, &output);

    if (status == OPT_SUCCESS) {
        printf("Optimization Success (L2).\n");
        printf("Output Trajectory:\n");
        for (i = 0; i < output.trajectory.size; i = i + 1) {
            printf("t=%.2f, v=%.4f\n", output.trajectory.points[i].t, output.trajectory.points[i].v);
        }
    } else {
        printf("Optimization Failed. Error Code: %d\n", status);
    }

    /* 清理内存 */
    free(input.trajectory.points);
    if (output.trajectory.points != NULL) {
        free(output.trajectory.points);
    }

    return 0;
}