/**
 * @brief 图像尺寸变换
 * @file funcSizeTransf.cpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-11-29
 */

#include "funcSizeTransf.hpp"

/**
 * @brief 图像尺寸变换
 * @param[IN] param01 shuchutuxiangdekuanhechang
 * @param[IN] input01 输入图像
 * @param[OUT] output01 输出图像
 * @cn_name: 图像尺寸变换
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void sizeTransformation(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  //cv::resize(imageSrc, imageDst, (width, height));
  cv::resize(input01.src, output01.des, param01.width, param01.height);
}