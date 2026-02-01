/**
 * @brief 图像翻转变换
 * @file funcFlipTransf.cpp
 * @version 0.0.1
 * @author Chuang Zhang
 * @date 2023-11-28
 */

#include "funcFlipTransf.hpp"

/**
 * @brief 图像翻转变换
 * @param[IN] param 翻转变换参数,上下翻转0，左右翻转1，180度旋转-1
 * @param[IN] input 输入图像
 * @param[OUT] output 输出图像
 * @cn_name: 图像翻转变换
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void flipTransformation(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  cv::flip(input01.src, output01.des, param01.flipCode);
  // cv::flip(imageSrc, imageDst, flipCode);
}