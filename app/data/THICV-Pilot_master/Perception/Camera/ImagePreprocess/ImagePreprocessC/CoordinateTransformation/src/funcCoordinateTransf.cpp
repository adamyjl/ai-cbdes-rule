/**
 * @brief 图像预坐标变换
 * @file funcCoordinateTransf.cpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-11-30
 */

#include "funcCoodinateTransf.hpp"

/**
 * @brief 图像坐标变换
 * @param[IN] param x映射表，y映射表,选择的插值方法
 * @param[IN] input 输入图像
 * @param[OUT] output 输出图像
 * @cn_name: 图像坐标变换
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */
void coordinateTransformation(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  cv::remap(input01.src, output01.des, param01.map1, param01.map2, param01.interpolation);
  // cv::remap(imageSrc, imageDst, map1, map2, interpolation);
}
