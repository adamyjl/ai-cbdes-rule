/**
 * @brief 图像滤波
 * @file funcMutifilter.cpp
 * @version 0.0.1
 * @author Haotian Zheng
 * @date 2023-12-04
 */

#include "funcMutifilter.hpp"

/**
 * @brief 图像滤波
 * @param[IN] param01 lvbozhonglei
 * @param[IN] input01 输入图像
 * @param[OUT] output01 输出图像
 * @cn_name: 图像滤波
 * @granularity: atomic //函数组件的粒度， atomic： 基础组件（原子），composite： 复合组件（在前端可以向下一层展开）
 */



// void mutifilter(cv::Mat imageSrc, cv::Mat &imageDst, int type) // 锟剿诧拷+plot锟斤拷image锟斤拷锟斤拷锟斤拷'opencv-logo-white.png'
void imageFilter(const ParamStruct01 &param01, const InputStruct01 &input01, OutputStruct01 &output01)
{
  if (param01.type == 0)
  {
    output01.des = cv::blur(input01.src, (5, 5));
  }
  else if (param01.type == 1)
  {
    output01.des = cv::medianBlur(input01.src, 5);
  }
  else if (param01.type == 2)
  {
    output01.des = cv::GaussianBlur(input01.src, (5, 5), 0);
  }
}
