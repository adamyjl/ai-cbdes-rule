/**
 * @brief 图像色彩空间变换
 * @file funcColorSpaceTransformation.cpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-11-28
 */

#include "funcColorSpaceTransformation.hpp"

/**
 * @brief 图像色彩空间变换
 * @param[IN] param01 色彩空间变换的种类，在这里设置
 * @param[IN] input01 输入图像
 * @param[OUT] output01 输出图像
 * @cn_name: 图像色彩空间变换
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void colorSpaceTransformation(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  cv::cvtColor(input01.src, output01.des, param01.colorCvtCode);
}
