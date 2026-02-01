/**
 * @brief 图像二值化
 * @file funcBinarization.cpp
 * @version 0.0.1
 * @author Chuang Zhang
 * @date 2023-11-28
 */

#include "funcBinarization.hpp"

/**
 * @brief 图像二值化
 * @param[IN] param01 二值化阈值
 * @param[IN] input01 输入图像
 * @param[OUT] output01 输出图像
 * @cn_name: 图像二值化
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void imageBinarization(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  cv::threshold(input01.src, output01.des, param01.thresholdBinarization, param01.maxValue, cv::THRESH_BINARY);
}
